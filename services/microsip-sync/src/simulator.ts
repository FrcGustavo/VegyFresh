import {
  chmodSync,
  mkdirSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { resolve, join } from "node:path";
import type {
  LookupResult,
  MicrosipAdapter,
  MicrosipOrder,
  Receipt,
} from "./contracts.js";

const SIMULATOR_APPLICATION_ID = 0x56465349; // VFSI
const SIMULATOR_SCHEMA_VERSION = 1;
const MAX_LINES = 500;
const MAX_KEY_LENGTH = 128;

function ensurePrivateDirectory(directory: string): void {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
}

function requireKey(value: unknown, field: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > MAX_KEY_LENGTH ||
    value.includes("\0")
  ) {
    throw new TypeError(`${field} must be a non-empty string of at most ${MAX_KEY_LENGTH} characters`);
  }
}

function initializeDatabase(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = FULL");
  db.exec("PRAGMA busy_timeout = 5000");

  const applicationId = Number(db.prepare("PRAGMA application_id").get()?.application_id ?? 0);
  const schemaVersion = Number(db.prepare("PRAGMA user_version").get()?.user_version ?? 0);
  if (applicationId !== 0 && applicationId !== SIMULATOR_APPLICATION_ID) {
    throw new Error("The simulator database belongs to a different application.");
  }
  if (schemaVersion !== 0 && schemaVersion !== SIMULATOR_SCHEMA_VERSION) {
    throw new Error(`Unsupported simulator database schema version ${schemaVersion}.`);
  }
  if (applicationId === 0 && schemaVersion === 0) {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .all();
    if (tables.length > 0) throw new Error("The simulator database has an unrecognized schema.");
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`PRAGMA application_id = ${SIMULATOR_APPLICATION_ID}`);
    db.exec(`PRAGMA user_version = ${SIMULATOR_SCHEMA_VERSION}`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS simulator_receipts (
        receipt_id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        external_id TEXT NOT NULL,
        folio TEXT NOT NULL UNIQUE,
        recorded_at TEXT NOT NULL,
        UNIQUE (company, external_id)
      );
    `);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Preserve the initialization error that caused the rollback.
    }
    throw error;
  }
}

/**
 * A deterministic local stand-in for the adapter contract. Validation checks
 * input shape and sensible quantities only; it does not check a live Microsip
 * catalog, customer mapping, units, stock, or price rules.
 */
export class SimulatorAdapter implements MicrosipAdapter {
  private readonly db: DatabaseSync;
  private closed = false;

  constructor(dataDir: string) {
    if (typeof dataDir !== "string" || dataDir.trim().length === 0) {
      throw new TypeError("Simulator dataDir must be a non-empty string");
    }
    const directory = resolve(dataDir);
    ensurePrivateDirectory(directory);
    const databasePath = join(directory, "simulator.sqlite");

    const db = new DatabaseSync(databasePath);
    try {
      initializeDatabase(db);
      chmodSync(databasePath, 0o600);
    } catch (error) {
      try {
        db.close();
      } catch {
        // Preserve the initialization error that caused cleanup.
      }
      throw error;
    }
    this.db = db;
  }

  async validate(order: MicrosipOrder): Promise<void> {
    if (!order || typeof order !== "object") throw new TypeError("Order must be an object");
    requireKey(order.externalId, "Order externalId");
    requireKey(order.company, "Order company");
    requireKey(order.branch, "Order branch");
    requireKey(order.warehouse, "Order warehouse");
    requireKey(order.customerKey, "Order customerKey");
    if (!Array.isArray(order.lines) || order.lines.length === 0 || order.lines.length > MAX_LINES) {
      throw new TypeError(`Order must contain between 1 and ${MAX_LINES} lines`);
    }

    for (const [index, line] of order.lines.entries()) {
      if (!line || typeof line !== "object") {
        throw new TypeError(`Order line ${index + 1} must be an object`);
      }
      requireKey(line.productKey, `Order line ${index + 1} productKey`);
      requireKey(line.unit, `Order line ${index + 1} unit`);
      if (!Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 1_000_000_000) {
        throw new TypeError(`Order line ${index + 1} quantity must be a finite positive number`);
      }
    }
  }

  async create(order: MicrosipOrder): Promise<Receipt> {
    this.assertOpen();
    await this.validate(order);

    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.findReceipt(order.externalId, order.company);
      if (existing) {
        this.db.exec("COMMIT");
        return existing;
      }

      const recordedAt = new Date().toISOString();
      const result = this.db
        .prepare(
          "INSERT INTO simulator_receipts (company, external_id, folio, recorded_at) VALUES (?, ?, ?, ?)",
        )
        .run(order.company, order.externalId, "pending", recordedAt);
      const receiptId = Number(result.lastInsertRowid);
      if (!Number.isSafeInteger(receiptId) || receiptId < 1) {
        throw new Error("The simulator could not allocate a receipt folio");
      }
      const folio = `SIM-${String(receiptId).padStart(8, "0")}`;
      this.db
        .prepare("UPDATE simulator_receipts SET folio = ? WHERE receipt_id = ?")
        .run(folio, receiptId);
      this.db.exec("COMMIT");
      return { folio, recordedAt };
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // Preserve the create error that caused the rollback.
      }
      throw error;
    }
  }

  async lookup(externalId: string, company: string): Promise<LookupResult> {
    this.assertOpen();
    requireKey(externalId, "Lookup externalId");
    requireKey(company, "Lookup company");
    const receipt = this.findReceipt(externalId, company);
    return receipt ? { status: "found", receipt } : { status: "absent" };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }

  private findReceipt(externalId: string, company: string): Receipt | undefined {
    const row = this.db
      .prepare(
        "SELECT folio, recorded_at FROM simulator_receipts WHERE external_id = ? AND company = ?",
      )
      .get(externalId, company) as { folio: string; recorded_at: string } | undefined;
    if (!row) return undefined;
    if (row.folio === "pending") throw new Error("The simulator database contains an incomplete receipt");
    return { folio: row.folio, recordedAt: row.recorded_at };
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("Simulator adapter is closed");
  }
}

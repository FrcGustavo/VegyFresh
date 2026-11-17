import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  realpathSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type {
  HistoryEntry,
  HistoryStatus,
  HistoryStore,
  MicrosipOrder,
  Receipt,
} from "./contracts.js";

const HISTORY_APPLICATION_ID = 0x56464849; // VFHI
const HISTORY_SCHEMA_VERSION = 1;
const VALID_STATUSES = new Set<HistoryStatus>([
  "retry",
  "submitting",
  "synced",
  "review",
]);

type EntryRow = {
  order_id: string;
  external_id: string;
  status: string;
  attempts: number;
  updated_at: string;
  next_attempt_at: string | null;
  receipt_json: string | null;
  error: string | null;
  payload_json: string | null;
};

function requireNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function ensurePrivateDirectory(directory: string): void {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
}

function setPrivateFileMode(filePath: string): void {
  chmodSync(filePath, 0o600);
}

function companyLockPath(company: string): string {
  const uid = typeof process.getuid === "function" ? String(process.getuid()) : "user";
  const configuredLockDirectory = process.env.MICROSIP_SYNC_LOCK_DIR;
  const lockDirectory = configuredLockDirectory
    ? resolve(configuredLockDirectory)
    : join(realpathSync(tmpdir()), "vegyfresh-microsip-locks", uid);
  ensurePrivateDirectory(lockDirectory);
  const companyHash = createHash("sha256").update(company, "utf8").digest("hex");
  return join(realpathSync(lockDirectory), `${companyHash}.sqlite`);
}

/**
 * Takes a per-company SQLite write lock. SQLite releases this kernel lock if
 * the process exits, so a PID file or time-based lease cannot strand a company.
 */
function acquireCompanyLock(company: string): () => void {
  const lockDb = new DatabaseSync(companyLockPath(company));
  try {
    lockDb.exec("PRAGMA busy_timeout = 0");
    lockDb.exec("BEGIN IMMEDIATE");
  } catch (error) {
    try {
      lockDb.close();
    } catch {
      // Preserve the lock acquisition error.
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/SQLITE_BUSY|database is locked/i.test(message)) {
      throw new Error(
        `Microsip synchronization for company "${company}" is already running on this machine.`,
        { cause: error },
      );
    }
    throw error;
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    try {
      lockDb.exec("ROLLBACK");
    } catch {
      // Closing the connection also releases its SQLite lock.
    }
    try {
      lockDb.close();
    } catch {
      // The process will release any remaining OS-level lock when it exits.
    }
  };
}

function configureHistoryDatabase(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = FULL");
  db.exec("PRAGMA busy_timeout = 5000");

  const applicationId = Number(db.prepare("PRAGMA application_id").get()?.application_id ?? 0);
  const schemaVersion = Number(db.prepare("PRAGMA user_version").get()?.user_version ?? 0);

  if (applicationId !== 0 && applicationId !== HISTORY_APPLICATION_ID) {
    throw new Error("The history database belongs to a different application.");
  }
  if (schemaVersion !== 0 && schemaVersion !== HISTORY_SCHEMA_VERSION) {
    throw new Error(`Unsupported history database schema version ${schemaVersion}.`);
  }
  if (applicationId === 0 && schemaVersion === 0) {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .all();
    if (tables.length > 0) {
      throw new Error("The history database has an unrecognized schema.");
    }
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`PRAGMA application_id = ${HISTORY_APPLICATION_ID}`);
    db.exec(`PRAGMA user_version = ${HISTORY_SCHEMA_VERSION}`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS history_identity (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        company TEXT NOT NULL,
        organization_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history_entries (
        order_id TEXT PRIMARY KEY,
        external_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('retry', 'submitting', 'synced', 'review')),
        attempts INTEGER NOT NULL CHECK (attempts >= 0),
        updated_at TEXT NOT NULL,
        next_attempt_at TEXT,
        receipt_json TEXT,
        error TEXT,
        payload_json TEXT
      );

      CREATE TABLE IF NOT EXISTS history_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        previous_status TEXT,
        next_status TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        entry_json TEXT NOT NULL
      );

      CREATE TRIGGER IF NOT EXISTS history_events_no_update
      BEFORE UPDATE ON history_events
      BEGIN
        SELECT RAISE(ABORT, 'history events are append-only');
      END;

      CREATE TRIGGER IF NOT EXISTS history_events_no_delete
      BEFORE DELETE ON history_events
      BEGIN
        SELECT RAISE(ABORT, 'history events are append-only');
      END;
    `);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Preserve the schema or storage error that caused the rollback.
    }
    throw error;
  }
}

function bindDatabaseIdentity(
  db: DatabaseSync,
  company: string,
  organizationId: string,
): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    const identity = db
      .prepare("SELECT company, organization_id FROM history_identity WHERE singleton = 1")
      .get() as { company: string; organization_id: string } | undefined;

    if (identity) {
      if (identity.company !== company) {
        throw new Error("The history database is already bound to a different company.");
      }
      if (identity.organization_id !== organizationId) {
        throw new Error("The history database is already bound to a different organization.");
      }
    } else {
      db.prepare(
        "INSERT INTO history_identity (singleton, company, organization_id) VALUES (1, ?, ?)",
      ).run(company, organizationId);
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Preserve the identity error that caused the rollback.
    }
    throw error;
  }
}

function encodeOptional(value: unknown): string | null {
  if (value === undefined) return null;
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new TypeError("History entry contains an unserializable value");
  return encoded;
}

function decodeReceipt(value: string | null): Receipt | undefined {
  if (value === null) return undefined;
  const receipt: unknown = JSON.parse(value);
  if (
    typeof receipt !== "object" ||
    receipt === null ||
    typeof (receipt as Receipt).folio !== "string" ||
    typeof (receipt as Receipt).recordedAt !== "string"
  ) {
    throw new Error("The history database contains an invalid receipt.");
  }
  return { folio: (receipt as Receipt).folio, recordedAt: (receipt as Receipt).recordedAt };
}

function decodePayload(value: string | null): MicrosipOrder | undefined {
  if (value === null) return undefined;
  const payload: unknown = JSON.parse(value);
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("The history database contains an invalid order payload.");
  }
  return payload as MicrosipOrder;
}

function entryFromRow(row: EntryRow): HistoryEntry {
  if (!VALID_STATUSES.has(row.status as HistoryStatus)) {
    throw new Error(`The history database contains an invalid status for order "${row.order_id}".`);
  }
  const entry: HistoryEntry = {
    orderId: row.order_id,
    externalId: row.external_id,
    status: row.status as HistoryStatus,
    attempts: row.attempts,
    updatedAt: row.updated_at,
  };
  if (row.next_attempt_at !== null) entry.nextAttemptAt = row.next_attempt_at;
  if (row.receipt_json !== null) entry.receipt = decodeReceipt(row.receipt_json);
  if (row.error !== null) entry.error = row.error;
  if (row.payload_json !== null) entry.payload = decodePayload(row.payload_json);
  return entry;
}

function validateEntry(entry: HistoryEntry): void {
  if (!entry || typeof entry !== "object") throw new TypeError("History entry must be an object");
  requireNonEmpty(entry.orderId, "History orderId");
  requireNonEmpty(entry.externalId, "History externalId");
  requireNonEmpty(entry.updatedAt, "History updatedAt");
  if (!VALID_STATUSES.has(entry.status)) throw new TypeError("History status is not supported");
  if (!Number.isSafeInteger(entry.attempts) || entry.attempts < 0) {
    throw new TypeError("History attempts must be a non-negative safe integer");
  }
  if (entry.nextAttemptAt !== undefined) requireNonEmpty(entry.nextAttemptAt, "History nextAttemptAt");
  if (entry.error !== undefined && typeof entry.error !== "string") {
    throw new TypeError("History error must be a string");
  }
  if (entry.receipt !== undefined) {
    requireNonEmpty(entry.receipt.folio, "Receipt folio");
    requireNonEmpty(entry.receipt.recordedAt, "Receipt recordedAt");
  }
}

class SqliteHistoryStore implements HistoryStore {
  private closed = false;

  constructor(
    private readonly db: DatabaseSync,
    private readonly releaseCompanyLock: () => void,
  ) {}

  get(orderId: string): HistoryEntry | undefined {
    this.assertOpen();
    requireNonEmpty(orderId, "History orderId");
    const row = this.db
      .prepare("SELECT * FROM history_entries WHERE order_id = ?")
      .get(orderId) as EntryRow | undefined;
    return row ? entryFromRow(row) : undefined;
  }

  list(): HistoryEntry[] {
    this.assertOpen();
    const rows = this.db
      .prepare("SELECT * FROM history_entries ORDER BY updated_at, order_id")
      .all() as EntryRow[];
    return rows.map(entryFromRow);
  }

  save(entry: HistoryEntry): void {
    this.assertOpen();
    validateEntry(entry);

    const receiptJson = encodeOptional(entry.receipt);
    const payloadJson = encodeOptional(entry.payload);
    const entryJson = JSON.stringify(entry);
    if (entryJson === undefined) throw new TypeError("History entry cannot be serialized");

    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.db
        .prepare("SELECT status FROM history_entries WHERE order_id = ?")
        .get(entry.orderId) as { status: HistoryStatus } | undefined;

      this.db
        .prepare(`
          INSERT INTO history_entries (
            order_id, external_id, status, attempts, updated_at,
            next_attempt_at, receipt_json, error, payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(order_id) DO UPDATE SET
            external_id = excluded.external_id,
            status = excluded.status,
            attempts = excluded.attempts,
            updated_at = excluded.updated_at,
            next_attempt_at = excluded.next_attempt_at,
            receipt_json = excluded.receipt_json,
            error = excluded.error,
            payload_json = excluded.payload_json
        `)
        .run(
          entry.orderId,
          entry.externalId,
          entry.status,
          entry.attempts,
          entry.updatedAt,
          entry.nextAttemptAt ?? null,
          receiptJson,
          entry.error ?? null,
          payloadJson,
        );

      this.db
        .prepare(`
          INSERT INTO history_events (
            order_id, previous_status, next_status, occurred_at, entry_json
          ) VALUES (?, ?, ?, ?, ?)
        `)
        .run(entry.orderId, previous?.status ?? null, entry.status, entry.updatedAt, entryJson);
      this.db.exec("COMMIT");
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // Preserve the write error that caused the rollback.
      }
      throw error;
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.db.close();
    } finally {
      this.releaseCompanyLock();
    }
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("History store is closed");
  }
}

/** Open the durable company history and hold its single-process company lock until close(). */
export function openHistory(
  dataDir: string,
  company: string,
  organizationId: string,
): HistoryStore {
  requireNonEmpty(dataDir, "History dataDir");
  requireNonEmpty(company, "History company");
  requireNonEmpty(organizationId, "History organizationId");

  const directory = resolve(dataDir);
  ensurePrivateDirectory(directory);
  const releaseCompanyLock = acquireCompanyLock(company);
  let db: DatabaseSync | undefined;

  try {
    db = new DatabaseSync(join(directory, "history.sqlite"));
    configureHistoryDatabase(db);
    bindDatabaseIdentity(db, company, organizationId);
    setPrivateFileMode(join(directory, "history.sqlite"));
    return new SqliteHistoryStore(db, releaseCompanyLock);
  } catch (error) {
    try {
      db?.close();
    } catch {
      // Preserve the open or identity error that caused cleanup.
    }
    releaseCompanyLock();
    throw error;
  }
}

/** Read committed history without acquiring the write lock or creating files. */
export function readHistory(
  dataDir: string,
  company: string,
  organizationId: string,
): HistoryEntry[] {
  requireNonEmpty(dataDir, "History dataDir");
  requireNonEmpty(company, "History company");
  requireNonEmpty(organizationId, "History organizationId");

  const db = new DatabaseSync(join(resolve(dataDir), "history.sqlite"), { readOnly: true });
  try {
    const applicationId = Number(db.prepare("PRAGMA application_id").get()?.application_id ?? 0);
    if (applicationId !== HISTORY_APPLICATION_ID) {
      throw new Error("The history database is missing or belongs to a different application.");
    }
    const schemaVersion = Number(db.prepare("PRAGMA user_version").get()?.user_version ?? 0);
    if (schemaVersion !== HISTORY_SCHEMA_VERSION) {
      throw new Error(`Unsupported history database schema version ${schemaVersion}.`);
    }

    const identity = db
      .prepare("SELECT company, organization_id FROM history_identity WHERE singleton = 1")
      .get() as { company: string; organization_id: string } | undefined;
    if (!identity) throw new Error("The history database has no company identity.");
    if (identity.company !== company) {
      throw new Error("The history database is already bound to a different company.");
    }
    if (identity.organization_id !== organizationId) {
      throw new Error("The history database is already bound to a different organization.");
    }

    const rows = db
      .prepare("SELECT * FROM history_entries ORDER BY updated_at, order_id")
      .all() as EntryRow[];
    return rows.map(entryFromRow);
  } finally {
    db.close();
  }
}

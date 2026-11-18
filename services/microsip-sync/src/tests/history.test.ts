import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, realpathSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { openHistory, readHistory } from "../history.js";
import type { HistoryEntry, MicrosipOrder } from "../contracts.js";

function temporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), "vegyfresh-history-test-"));
}

const samplePayload: MicrosipOrder = {
  externalId: "order-42",
  company: "microsip-company",
  branch: "main",
  warehouse: "produce",
  customerKey: "customer-7",
  lines: [{ productKey: "tomato", unit: "kg", quantity: 5 }],
};

const sampleEntry: HistoryEntry = {
  orderId: "order-42",
  externalId: "order-42",
  status: "retry",
  attempts: 1,
  updatedAt: "2026-11-16T10:00:00.000Z",
  nextAttemptAt: "2026-11-16T10:01:00.000Z",
  error: "Temporary connection issue",
  payload: samplePayload,
};

test("history survives close and reopen and records append-only transitions", () => {
  const root = temporaryDirectory();
  const dataDir = join(root, "history");
  const first = openHistory(dataDir, "company-a", "organization-a");
  first.save(sampleEntry);
  first.save({
    ...sampleEntry,
    status: "synced",
    attempts: 2,
    updatedAt: "2026-11-16T10:02:00.000Z",
    nextAttemptAt: undefined,
    error: undefined,
    receipt: { folio: "MS-123", recordedAt: "2026-11-16T10:02:00.000Z" },
  });
  first.close();

  const reopened = openHistory(dataDir, "company-a", "organization-a");
  assert.deepEqual(reopened.get("order-42"), {
    orderId: "order-42",
    externalId: "order-42",
    status: "synced",
    attempts: 2,
    updatedAt: "2026-11-16T10:02:00.000Z",
    payload: samplePayload,
    receipt: { folio: "MS-123", recordedAt: "2026-11-16T10:02:00.000Z" },
  });
  assert.equal(reopened.list().length, 1);
  reopened.close();

  const inspect = new DatabaseSync(join(dataDir, "history.sqlite"));
  try {
    assert.equal(
      Number(inspect.prepare("SELECT COUNT(*) AS count FROM history_events").get()?.count),
      2,
    );
    assert.deepEqual(
      inspect
        .prepare("SELECT previous_status, next_status FROM history_events ORDER BY event_id")
        .all().map(row => ({ ...row })),
      [
        { previous_status: null, next_status: "retry" },
        { previous_status: "retry", next_status: "synced" },
      ],
    );
    assert.throws(() => inspect.exec("DELETE FROM history_events"), /append-only/);
  } finally {
    inspect.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a company lock blocks a second data directory and releases on close", () => {
  const root = temporaryDirectory();
  const first = openHistory(join(root, "one"), "company-lock-test", "organization-a");
  try {
    assert.throws(
      () => openHistory(join(root, "two"), "company-lock-test", "organization-a"),
      /already running on this machine/,
    );
  } finally {
    first.close();
  }

  const afterClose = openHistory(join(root, "two"), "company-lock-test", "organization-a");
  afterClose.close();
  rmSync(root, { recursive: true, force: true });
});

test("readHistory reads committed entries while a writer holds the company lock", () => {
  const root = temporaryDirectory();
  const dataDir = join(root, "history");
  const writer = openHistory(dataDir, "company-read-test", "organization-a");
  try {
    writer.save(sampleEntry);
    assert.deepEqual(readHistory(dataDir, "company-read-test", "organization-a"), [sampleEntry]);
    assert.throws(
      () => openHistory(join(root, "another-history"), "company-read-test", "organization-a"),
      /already running on this machine/,
    );
  } finally {
    writer.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a company lock is released when its holding process dies", async () => {
  const root = temporaryDirectory();
  const dataDir = join(root, "history");
  const initialize = openHistory(dataDir, "company-crash-test", "organization-a");
  initialize.close();

  const uid = typeof process.getuid === "function" ? String(process.getuid()) : "user";
  const companyHash = createHash("sha256").update("company-crash-test", "utf8").digest("hex");
  const lockDirectory = process.env.MICROSIP_SYNC_LOCK_DIR
    ? realpathSync(resolve(process.env.MICROSIP_SYNC_LOCK_DIR))
    : join(realpathSync(tmpdir()), "vegyfresh-microsip-locks", uid);
  const lockPath = join(lockDirectory, `${companyHash}.sqlite`);
  const childCode = [
    "const { DatabaseSync } = require('node:sqlite');",
    "const db = new DatabaseSync(process.argv[1]);",
    "db.exec('PRAGMA busy_timeout = 0; BEGIN IMMEDIATE');",
    "process.stdout.write('locked\\n');",
    "setInterval(() => {}, 1000);",
  ].join("\n");
  const child = spawn(process.execPath, ["-e", childCode, lockPath], { stdio: ["ignore", "pipe", "pipe"] });
  if (!child.stdout) throw new Error("Could not observe the lock holder process");

  try {
    await once(child.stdout, "data");
    assert.throws(
      () => openHistory(join(root, "other"), "company-crash-test", "organization-a"),
      /already running on this machine/,
    );
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;

    const recovered = openHistory(join(root, "other"), "company-crash-test", "organization-a");
    recovered.close();
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test("history rejects company or organization identity reuse", () => {
  const root = temporaryDirectory();
  const dataDir = join(root, "history");
  const store = openHistory(dataDir, "company-a", "organization-a");
  store.close();

  assert.throws(
    () => openHistory(dataDir, "company-a", "organization-b"),
    /different organization/,
  );
  assert.throws(() => openHistory(dataDir, "company-b", "organization-a"), /different company/);

  const validReuse = openHistory(dataDir, "company-a", "organization-a");
  validReuse.close();
  rmSync(root, { recursive: true, force: true });
});

test("readHistory enforces the database company and organization identity", () => {
  const root = temporaryDirectory();
  const dataDir = join(root, "history");
  const store = openHistory(dataDir, "company-a", "organization-a");
  store.close();

  assert.throws(() => readHistory(dataDir, "company-b", "organization-a"), /different company/);
  assert.throws(
    () => readHistory(dataDir, "company-a", "organization-b"),
    /different organization/,
  );
  rmSync(root, { recursive: true, force: true });
});

test("readHistory does not create a missing data directory or database", () => {
  const root = temporaryDirectory();
  const missingDirectory = join(root, "missing", "history");

  assert.throws(() => readHistory(missingDirectory, "company-a", "organization-a"));
  assert.equal(existsSync(missingDirectory), false);
  rmSync(root, { recursive: true, force: true });
});

test("history rejects corrupt and unrecognized database state", () => {
  const root = temporaryDirectory();
  const corruptDir = join(root, "corrupt");
  const unrecognizedDir = join(root, "unrecognized");

  mkdirSync(corruptDir, { recursive: true });
  writeFileSync(join(corruptDir, "history.sqlite"), "not a sqlite database");
  assert.throws(() => openHistory(corruptDir, "company-a", "organization-a"));

  mkdirSync(unrecognizedDir, { recursive: true });
  const unrelated = new DatabaseSync(join(unrecognizedDir, "history.sqlite"));
  unrelated.exec("CREATE TABLE unrelated (value TEXT)");
  unrelated.close();
  assert.throws(() => openHistory(unrecognizedDir, "company-a", "organization-a"), /unrecognized schema/);
  rmSync(root, { recursive: true, force: true });
});

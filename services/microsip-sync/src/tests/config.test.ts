import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { loadConfig } from "../config.js";

const organizationId = "a9f05b2f-1a48-4e64-b5cb-0d48a1e66e41";
const clientId = "73978b0c-2666-4d85-8171-c49861949a57";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "microsip-sync-config-"));
  const path = join(directory, "config.json");
  const raw = {
    apiBaseUrl: "https://api.example.test/api/v1",
    organizationId,
    company: "Empresa",
    branch: "Sucursal",
    warehouse: "Almacen",
    since: "2026-11-01T03:15:00Z",
    pageSize: 50,
    pollIntervalMs: 30_000,
    retryDelayMs: 5_000,
    maxAttempts: 5,
    dataDir: "./data",
    adapter: { mode: "module", modulePath: "./adapter.mjs" },
    clients: { [clientId]: "C-001" },
    units: { kg: "KG", pz: "PZA" },
  };
  const save = (value: unknown = raw) => writeFileSync(path, JSON.stringify(value));
  save();
  return { directory, path, raw, save };
}

test("loads strict config, defaults to approved, and resolves local paths", (t) => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));

  const loaded = loadConfig(config.path);
  assert.deepEqual(loaded.statuses, ["APPROVED"]);
  assert.equal(loaded.organizationId, organizationId);
  assert.equal(loaded.dataDir, resolve(config.directory, "data"));
  assert.deepEqual(loaded.adapter, {
    mode: "module",
    modulePath: resolve(config.directory, "adapter.mjs"),
  });
  assert.deepEqual(loaded.clients, { [clientId]: "C-001" });
  assert.deepEqual(loaded.units, { kg: "KG", pz: "PZA" });
});

test("allows pending review only when explicitly configured", (t) => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));
  config.save({ ...config.raw, statuses: ["APPROVED", "PENDING_REVIEW"] });

  assert.deepEqual(loadConfig(config.path).statuses, ["APPROVED", "PENDING_REVIEW"]);
});

test("rejects poll intervals above the Node timer limit", t => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));
  config.save({ ...config.raw, pollIntervalMs: 2_147_483_648 });
  assert.throws(() => loadConfig(config.path), /pollIntervalMs/);
});

test("resolves absolute data and module paths unchanged", (t) => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));
  const absoluteDataDir = resolve(config.directory, "elsewhere");
  const absoluteModule = resolve(config.directory, "adapter.mjs");
  config.save({
    ...config.raw,
    dataDir: absoluteDataDir,
    adapter: { mode: "module", modulePath: absoluteModule },
  });

  const loaded = loadConfig(config.path);
  assert.equal(loaded.dataDir, absoluteDataDir);
  assert.deepEqual(loaded.adapter, { mode: "module", modulePath: absoluteModule });
});

test("accepts the simulator adapter", (t) => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));
  config.save({ ...config.raw, adapter: { mode: "simulator" } });

  assert.deepEqual(loadConfig(config.path).adapter, { mode: "simulator" });
});

test("rejects missing fields, unknown fields, and embedded token values", (t) => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));
  const invalidConfigs = [
    { ...config.raw, warehouse: undefined },
    { ...config.raw, accessToken: "must-not-be-in-config" },
    { ...config.raw, apiToken: "must-not-be-in-config" },
  ];

  for (const value of invalidConfigs) {
    config.save(value);
    assert.throws(() => loadConfig(config.path), /Invalid Microsip sync config/);
  }
});

test("rejects invalid cutoff, UUID maps, units, statuses, and path modes", (t) => {
  const config = fixture();
  t.after(() => rmSync(config.directory, { recursive: true, force: true }));
  const invalidConfigs = [
    { ...config.raw, since: "2026-11-01" },
    { ...config.raw, since: "2026-02-30T00:00:00Z" },
    { ...config.raw, organizationId: "org-1" },
    { ...config.raw, clients: { "client-1": "C-001" } },
    { ...config.raw, units: { kg: "KG" } },
    { ...config.raw, units: { kg: "KG", pz: "PZA", box: "BOX" } },
    { ...config.raw, statuses: ["APPROVED", "CANCELED"] },
    { ...config.raw, adapter: { mode: "module" } },
    { ...config.raw, adapter: { mode: "simulator", modulePath: "./bad.mjs" } },
  ];

  for (const value of invalidConfigs) {
    config.save(value);
    assert.throws(() => loadConfig(config.path), /Invalid Microsip sync config/);
  }
});

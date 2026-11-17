import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { boundAdapter, loadAdapter } from "../adapter.js";
import type { MicrosipAdapter, MicrosipOrder } from "../contracts.js";

const payload: MicrosipOrder = {
  externalId: "vf-1", company: "TEST", branch: "01", warehouse: "01",
  customerKey: "C1", lines: [{ productKey: "P1", unit: "KG", quantity: 5 }],
};

test("a timed-out write cannot be retried from an absent lookup while it might still commit", async () => {
  let complete!: (value: { folio: string; recordedAt: string }) => void;
  let found = false;
  const receipt = { folio: "MS1", recordedAt: new Date().toISOString() };
  const driver: MicrosipAdapter = {
    validate: async () => {},
    create: () => new Promise(resolve => { complete = resolve; }),
    lookup: async () => found ? { status: "found", receipt } : { status: "absent" },
  };
  const adapter = boundAdapter(driver, 5);
  await assert.rejects(adapter.create(payload), /timed out/);
  assert.deepEqual(await adapter.lookup("vf-1", "TEST"), { status: "unknown" });
  assert.deepEqual(await adapter.lookup("another", "TEST"), { status: "absent" });
  found = true;
  complete(receipt);
  assert.deepEqual(await adapter.lookup("vf-1", "TEST"), { status: "found", receipt });
});

test("bounds hung validation and lookup", async () => {
  const adapter = boundAdapter({
    validate: () => new Promise(() => {}),
    create: () => new Promise(() => {}),
    lookup: () => new Promise(() => {}),
  }, 5);
  await assert.rejects(adapter.validate(payload), /timed out/);
  await assert.rejects(adapter.lookup("vf-1", "TEST"), /timed out/);
});

test("bounds external driver initialization without silently falling back to simulation", async t => {
  const directory = await mkdtemp(join(tmpdir(), "vf-sync-driver-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const modulePath = join(directory, "driver.mjs");
  await writeFile(modulePath, "export const createAdapter = () => new Promise(() => {});");
  const config = JSON.parse(await readFile(new URL("../../config.example.json", import.meta.url), "utf8"));
  config.adapter = { mode: "module", modulePath };
  await assert.rejects(loadAdapter(config, 100), /timed out/);
});

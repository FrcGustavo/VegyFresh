import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SimulatorAdapter } from "../simulator.js";
import type { MicrosipOrder } from "../contracts.js";

function temporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), "vegyfresh-simulator-test-"));
}

const order: MicrosipOrder = {
  externalId: "order-42",
  company: "company-a",
  branch: "main",
  warehouse: "produce",
  customerKey: "customer-7",
  lines: [
    { productKey: "tomato", unit: "kg", quantity: 5 },
    { productKey: "cucumber", unit: "piece", quantity: 3 },
  ],
};

test("simulator receipts survive restart and create is idempotent by company and external ID", async () => {
  const root = temporaryDirectory();
  const first = new SimulatorAdapter(root);
  const receipt = await first.create(order);
  assert.match(receipt.folio, /^SIM-\d{8,}$/);
  assert.deepEqual(await first.lookup(order.externalId, order.company), { status: "found", receipt });
  first.close();

  const restarted = new SimulatorAdapter(root);
  assert.deepEqual(await restarted.lookup(order.externalId, order.company), {
    status: "found",
    receipt,
  });
  assert.deepEqual(await restarted.create(order), receipt);
  const otherCompanyReceipt = await restarted.create({ ...order, company: "company-b" });
  assert.notEqual(otherCompanyReceipt.folio, receipt.folio);
  assert.deepEqual(await restarted.lookup("unknown-order", order.company), { status: "absent" });
  restarted.close();
  rmSync(root, { recursive: true, force: true });
});

test("simulator validates order shape and positive quantities", async () => {
  const root = temporaryDirectory();
  const adapter = new SimulatorAdapter(root);
  await assert.rejects(
    adapter.validate({ ...order, lines: [{ productKey: "tomato", unit: "kg", quantity: 0 }] }),
    /quantity must be a finite positive number/,
  );
  await assert.rejects(adapter.validate({ ...order, lines: [] }), /between 1 and/);
  adapter.close();
  rmSync(root, { recursive: true, force: true });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Order } from "@vegyfresh/api-client";
import type {
  HistoryEntry,
  HistoryStore,
  LookupResult,
  MicrosipAdapter,
  MicrosipOrder,
  OrderSource,
  Receipt,
  SyncConfig,
} from "../contracts.js";
import { mapOrder, runCycle } from "../engine.js";

const ORG = "org-1";
const CLIENT = "client-1";
const PRODUCT = "product-1";
const ORDER = "order-1";
const NOW = new Date("2026-11-16T18:00:00.000Z");
const RECEIPT: Receipt = {
  folio: "MS-0001",
  recordedAt: "2026-11-16T18:00:00.000Z",
};

function config(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return {
    apiBaseUrl: "https://api.example.test",
    organizationId: ORG,
    company: "VEGY",
    branch: "01",
    warehouse: "WH1",
    since: "2026-11-16T00:00:00.000Z",
    statuses: ["APPROVED"],
    pageSize: 100,
    pollIntervalMs: 1000,
    retryDelayMs: 1000,
    maxAttempts: 3,
    dataDir: "/tmp/microsip-sync-test",
    adapter: { mode: "simulator" },
    clients: { [CLIENT]: "MICROSIP-CUSTOMER" },
    units: { kg: "KILO", pz: "PIEZA" },
    ...overrides,
  };
}

function order(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? ORDER;
  return {
    id,
    folio: "VF-0001",
    client_id: CLIENT,
    user_id: "user-1",
    organization_id: ORG,
    total_amount: 500,
    description: null,
    status: "APPROVED",
    origin: "WHATSAPP",
    delivery_date: null,
    created_at: "2026-11-16T00:00:00.000Z",
    client: {
      id: CLIENT,
      folio: "CLIENT-FOLIO",
      name: "Customer",
      phone_number: "+520000000000",
      email: null,
      country: null,
      state: null,
      city: null,
      postal_code: null,
      address: null,
      suburb: null,
      external_number: null,
      internal_number: null,
      avatar_url: null,
      price_list_id: null,
      organization_id: ORG,
    },
    items: [
      {
        id: "item-1",
        order_id: id,
        product_id: PRODUCT,
        quantity: 2.375,
        unit_price: 9999,
        subtotal: 23747.625,
        product: {
          id: PRODUCT,
          folio: "P-0042",
          name: "Tomato",
          description: null,
          supplier_id: "supplier-1",
          organization_id: ORG,
          stock: 10,
          unit: "kg",
          images: [],
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      },
    ],
    ...overrides,
  };
}

function typedOrder(value: unknown): Order {
  return value as Order;
}

class MemoryHistory implements HistoryStore {
  readonly entries = new Map<string, HistoryEntry>();
  readonly saves: HistoryEntry[] = [];

  get(orderId: string): HistoryEntry | undefined {
    return this.entries.get(orderId);
  }

  list(): HistoryEntry[] {
    return [...this.entries.values()];
  }

  save(entry: HistoryEntry): void {
    this.saves.push(structuredClone(entry));
    this.entries.set(entry.orderId, structuredClone(entry));
  }

  close(): void {}
}

class Source implements OrderSource {
  constructor(
    readonly listed: Order[],
    readonly fresh: Map<string, Order> = new Map(listed.map((value) => [value.id, value])),
  ) {}

  async *listOrders(): AsyncIterable<Order> {
    yield* this.listed;
  }

  async getOrder(id: string): Promise<Order> {
    const value = this.fresh.get(id);
    if (!value) throw new Error("not found");
    return value;
  }
}

class Adapter implements MicrosipAdapter {
  validations: MicrosipOrder[] = [];
  creations: MicrosipOrder[] = [];
  lookups: string[] = [];
  createError?: Error;
  createReceipt: unknown = RECEIPT;
  lookupResult: LookupResult = { status: "absent" };
  events: string[] = [];

  async validate(value: MicrosipOrder): Promise<void> {
    this.events.push("validate");
    this.validations.push(structuredClone(value));
  }

  async create(value: MicrosipOrder): Promise<Receipt> {
    this.events.push("create");
    this.creations.push(structuredClone(value));
    if (this.createError) throw this.createError;
    return this.createReceipt as Receipt;
  }

  async lookup(externalId: string): Promise<LookupResult> {
    this.events.push("lookup");
    this.lookups.push(externalId);
    return this.lookupResult;
  }
}

test("mapOrder uses UUID customer mapping, exact product folio and omits all prices", () => {
  const mapped = mapOrder(order(), config());

  assert.deepEqual(mapped, {
    externalId: `vegyfresh:${ORG}:${ORDER}`,
    company: "VEGY",
    branch: "01",
    warehouse: "WH1",
    customerKey: "MICROSIP-CUSTOMER",
    lines: [{ productKey: "P-0042", unit: "KILO", quantity: 2.375 }],
  });
  assert.equal(JSON.stringify(mapped).includes("unit_price"), false);
  assert.equal(JSON.stringify(mapped).includes("subtotal"), false);
  assert.equal(JSON.stringify(mapped).includes("total_amount"), false);
});

test("mapOrder accepts decimal API strings but rejects invalid precision, pz fractions, and missing unit mappings", () => {
  const decimalString = typedOrder({
    ...order(),
    items: [{ ...order().items![0], quantity: "0.125" }],
  });
  assert.equal(mapOrder(decimalString, config()).lines[0].quantity, 0.125);

  const tooPrecise = typedOrder({
    ...order(),
    items: [{ ...order().items![0], quantity: "0.1234" }],
  });
  assert.throws(() => mapOrder(tooPrecise, config()));

  const overflow = typedOrder({
    ...order(),
    items: [{ ...order().items![0], quantity: "1000000000" }],
  });
  assert.throws(() => mapOrder(overflow, config()));

  const fractionalPieces = typedOrder({
    ...order(),
    items: [
      {
        ...order().items![0],
        quantity: "1.5",
        product: { ...order().items![0].product!, unit: "pz" },
      },
    ],
  });
  assert.throws(() => mapOrder(fractionalPieces, config()));

  assert.throws(() => mapOrder(order(), config({ units: { pz: "PIEZA" } })));
});

test("mapOrder rejects cross-tenant and mismatched client or product identities", () => {
  assert.throws(() => mapOrder(order({ organization_id: "other-org" }), config()));
  assert.throws(
    () => mapOrder(order({ client: { ...order().client!, id: "other-client" } }), config()),
  );
  assert.throws(
    () =>
      mapOrder(
        typedOrder({
          ...order(),
          items: [
            {
              ...order().items![0],
              product: { ...order().items![0].product!, organization_id: "other-org" },
            },
          ],
        }),
        config(),
      ),
  );
  assert.throws(
    () =>
      mapOrder(
        typedOrder({
          ...order(),
          items: [
            {
              ...order().items![0],
              product: { ...order().items![0].product!, id: "other-product" },
            },
          ],
        }),
        config(),
      ),
  );
  assert.throws(
    () =>
      mapOrder(
        typedOrder({
          ...order(),
          items: [{ ...order().items![0], order_id: "other-order" }],
        }),
        config(),
      ),
  );
  assert.throws(
    () =>
      mapOrder(
        typedOrder({
          ...order(),
          items: [
            {
              ...order().items![0],
              product: { ...order().items![0].product!, folio: "   " },
            },
          ],
        }),
        config(),
      ),
  );
  assert.throws(
    () => mapOrder(order(), config({ clients: { "some-other-client": "MAPPED" } })),
  );
});

test("runCycle submits only eligible WhatsApp orders, including the since boundary", async () => {
  const approvedAtBoundary = order();
  const pending = order({ id: "order-pending", status: "PENDING_REVIEW" });
  const admin = order({ id: "order-admin", origin: "ADMIN" });
  const beforeSince = order({
    id: "order-old",
    created_at: "2026-11-15T23:59:59.999Z",
  });
  const source = new Source([approvedAtBoundary, pending, admin, beforeSince]);
  const history = new MemoryHistory();
  const adapter = new Adapter();

  const result = await runCycle({ config: config(), source, history, adapter, now: NOW });

  assert.equal(result.scanned, 4);
  assert.equal(adapter.creations.length, 1);
  assert.equal(adapter.creations[0].externalId, `vegyfresh:${ORG}:${ORDER}`);
  assert.equal(history.get(ORDER)?.status, "synced");
  assert.equal(history.get("order-pending"), undefined);
});

test("runCycle rechecks approval on the fresh API read, allowing late approval next cycle", async () => {
  const pending = order({ status: "PENDING_REVIEW" });
  const history = new MemoryHistory();
  const adapter = new Adapter();

  const first = await runCycle({
    config: config(),
    source: new Source([pending], new Map([[ORDER, pending]])),
    history,
    adapter,
    now: NOW,
  });
  assert.equal(first.skipped, 1);
  assert.equal(adapter.creations.length, 0);

  const approved = order({ status: "APPROVED" });
  const stillPending = order({ status: "PENDING_REVIEW" });
  const staleListing = await runCycle({
    config: config(),
    source: new Source([approved], new Map([[ORDER, stillPending]])),
    history,
    adapter,
    now: NOW,
  });
  assert.equal(staleListing.skipped, 1);
  assert.equal(adapter.creations.length, 0);

  await runCycle({
    config: config(),
    source: new Source([approved], new Map([[ORDER, approved]])),
    history,
    adapter,
    now: NOW,
  });
  assert.equal(adapter.creations.length, 1);
  assert.equal(history.get(ORDER)?.status, "synced");
});

test("runCycle refuses a fresh cross-tenant order before any adapter write", async () => {
  const listed = order();
  const fresh = order({ organization_id: "other-org" });
  const adapter = new Adapter();
  const history = new MemoryHistory();

  const result = await runCycle({
    config: config(),
    source: new Source([listed], new Map([[ORDER, fresh]])),
    history,
    adapter,
    now: NOW,
  });

  assert.equal(result.skipped, 1);
  assert.equal(adapter.validations.length, 0);
  assert.equal(adapter.creations.length, 0);
});

test("runCycle refuses a fresh order whose identity does not match the listed order", async () => {
  const listed = order();
  const fresh = order({ id: "different-order" });
  const adapter = new Adapter();
  const history = new MemoryHistory();

  const result = await runCycle({
    config: config(),
    source: new Source([listed], new Map([[ORDER, fresh]])),
    history,
    adapter,
    now: NOW,
  });

  assert.equal(result.skipped, 1);
  assert.equal(adapter.creations.length, 0);
});

test("mapping failure is safely retried, then succeeds after local correction", async () => {
  const history = new MemoryHistory();
  const adapter = new Adapter();
  const first = await runCycle({
    config: config({ clients: {} }),
    source: new Source([order()]),
    history,
    adapter,
    now: NOW,
  });
  assert.equal(first.retry, 1);
  assert.equal(history.get(ORDER)?.status, "retry");
  assert.equal(history.get(ORDER)?.error, "Order mapping is incomplete or invalid.");
  assert.equal(adapter.creations.length, 0);

  const corrected = await runCycle({
    config: config(),
    source: new Source([order()]),
    history,
    adapter,
    now: new Date("2026-11-16T18:00:02.000Z"),
  });
  assert.equal(corrected.synced, 1);
  assert.equal(history.get(ORDER)?.status, "synced");
});

test("submission intent is persisted before the external create", async () => {
  const history = new MemoryHistory();
  const adapter = new Adapter();
  const originalSave = history.save.bind(history);
  history.save = (entry) => {
    if (entry.status === "submitting") {
      assert.equal(adapter.creations.length, 0);
      assert.equal(entry.payload?.externalId, `vegyfresh:${ORG}:${ORDER}`);
    }
    originalSave(entry);
  };

  await runCycle({
    config: config(),
    source: new Source([order()]),
    history,
    adapter,
    now: NOW,
  });
  assert.deepEqual(adapter.events.slice(0, 2), ["validate", "create"]);
});

test("restart reconciliation finds a prior write even when API listing is empty", async () => {
  const history = new MemoryHistory();
  const payload = mapOrder(order(), config());
  history.save({
    orderId: ORDER,
    externalId: payload.externalId,
    status: "submitting",
    attempts: 1,
    updatedAt: NOW.toISOString(),
    payload,
  });
  const adapter = new Adapter();
  adapter.lookupResult = { status: "found", receipt: RECEIPT };

  const result = await runCycle({
    config: config(),
    source: new Source([]),
    history,
    adapter,
    now: NOW,
  });

  assert.equal(result.synced, 1);
  assert.equal(adapter.lookups[0], payload.externalId);
  assert.equal(adapter.creations.length, 0);
  assert.equal(history.get(ORDER)?.status, "synced");
});

test("ambiguous create errors reconcile to found, absent backoff, or manual review", async (t) => {
  await t.test("found receipt marks synced without a second write", async () => {
    const history = new MemoryHistory();
    const adapter = new Adapter();
    adapter.createError = new Error("token=must-not-be-persisted upstream body");
    adapter.lookupResult = { status: "found", receipt: RECEIPT };
    const result = await runCycle({
      config: config(),
      source: new Source([order()]),
      history,
      adapter,
      now: NOW,
    });
    assert.equal(result.synced, 1);
    assert.equal(adapter.creations.length, 1);
    assert.equal(history.get(ORDER)?.status, "synced");
    assert.equal(JSON.stringify(history.get(ORDER)).includes("must-not-be-persisted"), false);
  });

  await t.test("authoritative absence schedules backoff", async () => {
    const history = new MemoryHistory();
    const adapter = new Adapter();
    adapter.createError = new Error("socket closed");
    adapter.lookupResult = { status: "absent" };
    const result = await runCycle({
      config: config(),
      source: new Source([order()]),
      history,
      adapter,
      now: NOW,
    });
    assert.equal(result.retry, 1);
    assert.equal(history.get(ORDER)?.status, "retry");
    assert.equal(history.get(ORDER)?.nextAttemptAt, "2026-11-16T18:00:01.000Z");
  });

  await t.test("unknown outcome is terminal review and never auto-retried", async () => {
    const history = new MemoryHistory();
    const adapter = new Adapter();
    adapter.createError = new Error("socket closed");
    adapter.lookupResult = { status: "unknown" };
    const source = new Source([order()]);
    const first = await runCycle({ config: config(), source, history, adapter, now: NOW });
    assert.equal(first.review, 1);
    assert.equal(history.get(ORDER)?.status, "review");

    const second = await runCycle({
      config: config(),
      source,
      history,
      adapter,
      now: new Date("2026-11-16T18:00:10.000Z"),
    });
    assert.equal(second.skipped, 1);
    assert.equal(adapter.creations.length, 1);
  });
});

test("invalid create receipt is reconciled instead of accepted as synced", async () => {
  const history = new MemoryHistory();
  const adapter = new Adapter();
  adapter.createReceipt = { folio: "", recordedAt: "not-a-date" };
  adapter.lookupResult = { status: "unknown" };

  const result = await runCycle({
    config: config(),
    source: new Source([order()]),
    history,
    adapter,
    now: NOW,
  });
  assert.equal(result.review, 1);
  assert.equal(adapter.lookups.length, 1);
  assert.equal(history.get(ORDER)?.status, "review");
});

test("an invalid lookup driver result becomes manual review", async () => {
  const history = new MemoryHistory();
  const adapter = new Adapter();
  adapter.createError = new Error("connection lost");
  adapter.lookupResult = undefined as unknown as LookupResult;

  const result = await runCycle({
    config: config(),
    source: new Source([order()]),
    history,
    adapter,
    now: NOW,
  });

  assert.equal(result.review, 1);
  assert.equal(history.get(ORDER)?.status, "review");
});

test("pre-write failures reach review after the configured bound", async () => {
  const history = new MemoryHistory();
  const adapter = new Adapter();
  const missingMapping = config({ clients: {}, maxAttempts: 2, retryDelayMs: 1 });
  const source = new Source([order()]);

  await runCycle({ config: missingMapping, source, history, adapter, now: NOW });
  const result = await runCycle({
    config: missingMapping,
    source,
    history,
    adapter,
    now: new Date(NOW.getTime() + 2),
  });

  assert.equal(result.review, 1);
  assert.equal(history.get(ORDER)?.status, "review");
  assert.equal(adapter.creations.length, 0);
});

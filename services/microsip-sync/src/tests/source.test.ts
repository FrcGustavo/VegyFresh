import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { Order } from "@vegyfresh/api-client";
import type { OrderSource, SyncConfig } from "../contracts.js";
import { createOrderSource } from "../source.js";

const organizationId = "00000000-0000-4000-8000-000000000001";
const otherOrganizationId = "00000000-0000-4000-8000-000000000099";
const clientId = "00000000-0000-4000-8000-000000000002";

function makeConfig(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return {
    apiBaseUrl: "https://api.example.test/api/v1",
    organizationId,
    company: "EMPRESA_PRUEBA",
    branch: "SUCURSAL_PRUEBA",
    warehouse: "ALMACEN_PRUEBA",
    since: "2026-11-16T03:15:00.000Z",
    statuses: ["APPROVED"],
    pageSize: 2,
    pollIntervalMs: 30_000,
    retryDelayMs: 5_000,
    maxAttempts: 5,
    dataDir: "/tmp/microsip-sync-test",
    adapter: { mode: "simulator" },
    clients: { [clientId]: "CLIENTE_PRUEBA" },
    units: { kg: "KG", pz: "PZA" },
    ...overrides,
  };
}

function order(
  id: string,
  createdAt: string,
  overrides: Partial<Order> = {},
): Order {
  return {
    id,
    folio: `ORD-${id}`,
    client_id: clientId,
    user_id: "00000000-0000-4000-8000-000000000003",
    organization_id: organizationId,
    total_amount: 100,
    description: null,
    status: "APPROVED",
    origin: "WHATSAPP",
    delivery_date: null,
    created_at: createdAt,
    client: undefined,
    user: undefined,
    items: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function collect(source: OrderSource): Promise<Order[]> {
  const result: Order[] = [];
  for await (const item of source.listOrders()) result.push(item);
  return result;
}

test("reads every array page, applies the exact cutoff, and requests stable ascending order", async () => {
  const requests: { url: URL; method: string }[] = [];
  const pages = [
    [
      order("one", "2026-11-16T03:00:00.000Z"),
      order("two", "2026-11-16T03:20:00.000Z", { status: "PENDING_REVIEW" }),
    ],
    [
      order("three", "2026-11-16T03:25:00.000Z"),
      order("four", "2026-11-16T03:30:00.000Z", { origin: "ADMIN" }),
    ],
    [order("five", "2026-11-16T03:35:00.000Z")],
  ];
  const source = createOrderSource(makeConfig(), {
    token: () => "test-token",
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: init?.method ?? "GET" });
      const offset = Number(new URL(String(input)).searchParams.get("offset"));
      const pageIndex = offset / 2;
      return jsonResponse(pages[pageIndex] ?? []);
    },
  });

  const listed = await collect(source);
  assert.deepEqual(listed.map(({ id }) => id), ["three", "five"]);
  assert.deepEqual(requests.map(({ url }) => url.searchParams.get("offset")), ["0", "2", "4"]);
  assert.ok(requests.every(({ method }) => method === "GET"));
  for (const { url } of requests) {
    assert.equal(url.pathname, "/api/v1/orders");
    assert.equal(url.searchParams.get("created_filter"), "range");
    assert.equal(url.searchParams.get("created_from"), "2026-11-16");
    assert.equal(url.searchParams.get("order_by"), "created_at");
    assert.equal(url.searchParams.get("order"), "asc");
    assert.equal(url.searchParams.get("limit"), "2");
  }
});

test("continues past a page envelope total and supports configured pending review", async () => {
  const requestedOffsets: string[] = [];
  const records = [
    order("one", "2026-11-16T03:20:00.000Z", { status: "PENDING_REVIEW" }),
    order("two", "2026-11-16T03:30:00.000Z"),
    order("three", "2026-11-16T03:40:00.000Z", { status: "PENDING_REVIEW" }),
  ];
  const source = createOrderSource(
    makeConfig({ pageSize: 1, statuses: ["APPROVED", "PENDING_REVIEW"] }),
    {
      token: () => "test-token",
      fetch: async (input) => {
        const url = new URL(String(input));
        const offset = Number(url.searchParams.get("offset"));
        requestedOffsets.push(String(offset));
        return jsonResponse({ data: [records[offset] ?? null].filter(Boolean), total: 1 });
      },
    },
  );

  assert.deepEqual((await collect(source)).map(({ id }) => id), ["one", "two", "three"]);
  assert.deepEqual(requestedOffsets, ["0", "1", "2", "3"]);
});

test("rechecks old pending orders on later polls and observes their approval", async () => {
  let status: Order["status"] = "PENDING_REVIEW";
  const source = createOrderSource(makeConfig({ pageSize: 5 }), {
    token: () => "test-token",
    fetch: async () => jsonResponse([order("late-approval", "2026-11-16T03:20:00.000Z", { status })]),
  });

  assert.deepEqual(await collect(source), []);
  status = "APPROVED";
  assert.deepEqual((await collect(source)).map(({ id }) => id), ["late-approval"]);
});

test("stops with an error when pagination repeats a page", async () => {
  const repeated = [order("same", "2026-11-16T03:20:00.000Z")];
  const source = createOrderSource(makeConfig({ pageSize: 1 }), {
    token: () => "test-token",
    fetch: async () => jsonResponse(repeated),
  });

  await assert.rejects(collect(source), /repeated an order page/);
});

test("rejects orders returned outside the configured organization", async () => {
  const source = createOrderSource(makeConfig(), {
    token: () => "test-token",
    fetch: async () =>
      jsonResponse([
        order("foreign", "2026-11-16T03:20:00.000Z", {
          organization_id: otherOrganizationId,
        }),
      ]),
  });

  await assert.rejects(collect(source), /another organization/);
});

test("gets a single order through the SDK and keeps all API traffic read-only", async () => {
  const requests: { url: URL; method: string }[] = [];
  const expected = order("00000000-0000-4000-8000-000000000010", "2026-11-16T03:20:00.000Z");
  const source = createOrderSource(makeConfig(), {
    token: () => "test-token",
    fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), method: init?.method ?? "GET" });
      return jsonResponse(expected);
    },
  });

  assert.deepEqual(await source.getOrder(expected.id), JSON.parse(JSON.stringify(expected)));
  assert.equal(requests[0]?.url.pathname, `/api/v1/orders/${expected.id}`);
  assert.ok(requests.every(({ method }) => method === "GET"));
});

test("reloads the token file on every request", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "microsip-sync-token-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const tokenFile = join(directory, "api-token");
  const previousToken = process.env.MICROSIP_SYNC_API_TOKEN;
  const previousTokenFile = process.env.MICROSIP_SYNC_TOKEN_FILE;
  delete process.env.MICROSIP_SYNC_API_TOKEN;
  process.env.MICROSIP_SYNC_TOKEN_FILE = tokenFile;
  t.after(() => {
    if (previousToken === undefined) delete process.env.MICROSIP_SYNC_API_TOKEN;
    else process.env.MICROSIP_SYNC_API_TOKEN = previousToken;
    if (previousTokenFile === undefined) delete process.env.MICROSIP_SYNC_TOKEN_FILE;
    else process.env.MICROSIP_SYNC_TOKEN_FILE = previousTokenFile;
  });

  const authorization: string[] = [];
  const source = createOrderSource(makeConfig(), {
    fetch: async (_input, init) => {
      authorization.push(new Headers(init?.headers).get("authorization") ?? "");
      return jsonResponse([]);
    },
  });

  await writeFile(tokenFile, "first-token\n");
  await collect(source);
  await writeFile(tokenFile, "rotated-token\n");
  await collect(source);
  assert.deepEqual(authorization, ["Bearer first-token", "Bearer rotated-token"]);
  assert.equal(await readFile(tokenFile, "utf8"), "rotated-token\n");
});

test("returns generic API errors without upstream messages or tokens", async () => {
  const secret = "secret-upstream-token";
  const source = createOrderSource(makeConfig(), {
    token: () => secret,
    fetch: async () =>
      jsonResponse({ message: `upstream private detail ${secret}` }, 502),
  });

  await assert.rejects(collect(source), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /HTTP 502/);
    assert.doesNotMatch(error.message, /private detail|secret-upstream-token/);
    return true;
  });
});

test("bounds API requests with an aborting timeout", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  let observedSignal: AbortSignal | undefined;
  const patchedSetTimeout = ((callback: (...args: never[]) => void, delay?: number) => {
    if (delay === 15_000) return originalSetTimeout(callback, 0);
    return originalSetTimeout(callback, delay);
  }) as unknown as typeof globalThis.setTimeout;
  globalThis.setTimeout = patchedSetTimeout;
  try {
    const source = createOrderSource(makeConfig(), {
      token: () => "test-token",
      fetch: async (_input, init) => {
        observedSignal = init?.signal as AbortSignal;
        return new Promise<Response>(() => {});
      },
    });

    await assert.rejects(collect(source), /request timed out/);
    assert.equal(observedSignal?.aborted, true);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

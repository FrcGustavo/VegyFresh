import { readFile } from "node:fs/promises";
import {
  ApiClientError,
  createApiClient,
  createFetchTransport,
  getCollectionItems,
  type Order,
  type OrderListQuery,
} from "@vegyfresh/api-client";
import type { OrderSource, SyncConfig } from "./contracts.js";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES_PER_SCAN = 10_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OrderSourceOptions {
  fetch?: typeof globalThis.fetch;
  token?: () => Promise<string> | string;
}

function errorForRequest(error: unknown, timedOut: boolean): Error {
  if (timedOut) return new Error("VegyFresh API request timed out");
  if (error instanceof ApiClientError) {
    return new Error(`VegyFresh API request failed (HTTP ${error.status})`);
  }
  return new Error("VegyFresh API request failed");
}

function defaultTokenProvider(): () => Promise<string> {
  return async () => {
    const environmentToken = process.env.MICROSIP_SYNC_API_TOKEN?.trim();
    const tokenFile = process.env.MICROSIP_SYNC_TOKEN_FILE?.trim();
    if (environmentToken && tokenFile) {
      throw new Error("Configure only one VegyFresh API token source");
    }
    if (environmentToken) return environmentToken;
    if (!tokenFile) throw new Error("VegyFresh API token is not configured");

    const token = (await readFile(tokenFile, "utf8")).trim();
    if (token === "") throw new Error("VegyFresh API token file is empty");
    return token;
  };
}

function orderFromResponse(value: unknown): Order {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { id?: unknown }).id !== "string" ||
    typeof (value as { organization_id?: unknown }).organization_id !== "string" ||
    typeof (value as { created_at?: unknown }).created_at !== "string"
  ) {
    throw new Error("VegyFresh API returned an invalid order");
  }
  return value as Order;
}

function orderTime(order: Order): number {
  const time = Date.parse(order.created_at);
  if (!Number.isFinite(time)) throw new Error("VegyFresh API returned an invalid order");
  return time;
}

function compareOrders(left: Order, right: Order): number {
  return orderTime(left) - orderTime(right) || left.id.localeCompare(right.id);
}

function pageItems(response: unknown): Order[] {
  let items: unknown;
  if (Array.isArray(response)) {
    items = response;
  } else if (
    typeof response === "object" &&
    response !== null &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    // The API currently returns an array; accepting the SDK's page envelope
    // keeps pagination compatible with servers that include a total count.
    items = getCollectionItems(response as { data: Order[]; total: number });
  } else {
    throw new Error("VegyFresh API returned an invalid order page");
  }
  return (items as unknown[]).map(orderFromResponse);
}

function createBoundedRequest<T>(
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error("timeout"));
    }, REQUEST_TIMEOUT_MS);
  });

  return Promise.race([request(controller.signal), timeout])
    .catch((error: unknown) => {
      throw errorForRequest(error, timedOut);
    })
    .finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });
}

export function createOrderSource(
  config: SyncConfig,
  options: OrderSourceOptions = {},
): OrderSource {
  const getToken = options.token ?? defaultTokenProvider();
  const request = createFetchTransport({
    baseUrl: config.apiBaseUrl,
    token: getToken,
    fetch: options.fetch,
  });
  const api = createApiClient({ request });
  const query: Omit<OrderListQuery, "offset" | "limit"> = {
    created_filter: "range",
    created_from: config.since.slice(0, 10),
    order_by: "created_at",
    order: "asc",
  };
  const since = Date.parse(config.since);
  const eligibleStatuses = new Set(config.statuses);

  return {
    async *listOrders() {
      const pageFingerprints = new Set<string>();
      let offset = 0;
      let previousOrder: Order | undefined;

      for (let pageNumber = 0; pageNumber < MAX_PAGES_PER_SCAN; pageNumber += 1) {
        const response = await createBoundedRequest((signal) =>
          api.orders.getAll(
            { ...query, limit: config.pageSize, offset },
            { signal },
          ),
        );
        const items = pageItems(response);
        if (items.length === 0) return;
        if (items.length > config.pageSize) {
          throw new Error("VegyFresh API returned an oversized order page");
        }

        const pageIds = items.map((order) => order.id);
        if (new Set(pageIds).size !== pageIds.length) {
          throw new Error("VegyFresh API returned duplicate orders in a page");
        }
        const fingerprint = JSON.stringify(pageIds);
        if (pageFingerprints.has(fingerprint)) {
          throw new Error("VegyFresh API repeated an order page; pagination stopped");
        }
        pageFingerprints.add(fingerprint);

        for (const order of items) {
          if (order.organization_id !== config.organizationId) {
            throw new Error("VegyFresh API returned an order from another organization");
          }
          if (previousOrder && compareOrders(previousOrder, order) > 0) {
            throw new Error("VegyFresh API order pages are not stably sorted");
          }
          previousOrder = order;
        }

        for (const order of items) {
          if (
            orderTime(order) >= since &&
            order.origin === "WHATSAPP" &&
            eligibleStatuses.has(order.status as (typeof config.statuses)[number])
          ) {
            yield order;
          }
        }

        if (items.length < config.pageSize) return;
        offset += config.pageSize;
      }

      throw new Error("VegyFresh API pagination exceeded the safety limit");
    },

    async getOrder(id: string) {
      if (!UUID_PATTERN.test(id)) throw new Error("Order ID must be a UUID");
      const order = await createBoundedRequest((signal) =>
        api.orders.get(encodeURIComponent(id), { signal }),
      ).then(orderFromResponse);
      if (order.organization_id !== config.organizationId) {
        throw new Error("VegyFresh API returned an order from another organization");
      }
      return order;
    },
  };
}

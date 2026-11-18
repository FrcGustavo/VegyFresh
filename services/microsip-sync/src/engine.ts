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
  SyncSummary,
} from "./contracts.js";

const safeMappingError = "Order mapping is incomplete or invalid.";
const safeReadError = "VegyFresh order could not be read; verify API access.";
const safeValidationError = "Microsip rejected the order during validation.";
const safeRefreshError = "Order could not be refreshed from VegyFresh.";
const safeUnknownWriteError =
  "Microsip write outcome is unknown; manual review is required.";
const safeMissingReceiptError =
  "Microsip did not return a valid receipt; the write is being reconciled.";

class MappingError extends Error {}

/** Convert one VegyFresh order into the price-free shape accepted by Microsip. */
export function mapOrder(order: Order, config: SyncConfig): MicrosipOrder {
  if (!order || !nonEmptyString(order.id)) throw new MappingError();
  if (
    !nonEmptyString(config.organizationId) ||
    !nonEmptyString(config.company) ||
    !nonEmptyString(config.branch) ||
    !nonEmptyString(config.warehouse)
  ) {
    throw new MappingError();
  }
  if (order.organization_id !== config.organizationId) throw new MappingError();
  if (!nonEmptyString(order.client_id) || !order.client) throw new MappingError();
  if (
    order.client.id !== order.client_id ||
    order.client.organization_id !== config.organizationId
  ) {
    throw new MappingError();
  }

  const customerKey = config.clients[order.client_id];
  if (!nonEmptyString(customerKey)) throw new MappingError();
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new MappingError();
  }

  const lines = order.items.map((item) => {
    if (
      !item ||
      item.order_id !== order.id ||
      !nonEmptyString(item.product_id) ||
      !item.product ||
      item.product.id !== item.product_id ||
      item.product.organization_id !== config.organizationId ||
      !nonEmptyString(item.product.folio)
    ) {
      throw new MappingError();
    }

    const unit = config.units[item.product.unit];
    const quantity = normalizeQuantity(item.quantity);
    if (!nonEmptyString(unit) || quantity === undefined) throw new MappingError();
    if (item.product.unit === "pz" && !Number.isInteger(quantity)) {
      throw new MappingError();
    }

    return {
      // Microsip uses the catalog folio verbatim; the VegyFresh UUID is only
      // used above to verify the relation belongs to this order.
      productKey: item.product.folio,
      unit,
      quantity,
    };
  });

  return {
    externalId: makeExternalId(config.organizationId, order.id),
    company: config.company,
    branch: config.branch,
    warehouse: config.warehouse,
    customerKey,
    lines,
  };
}

export interface RunCycleOptions {
  config: SyncConfig;
  source: OrderSource;
  history: HistoryStore;
  adapter: MicrosipAdapter;
  /** Fixed clock for one cycle, primarily useful for deterministic scheduling. */
  now?: Date;
  signal?: AbortSignal;
}

/** Reconcile uncertain writes, then submit currently eligible WhatsApp orders. */
export async function runCycle({
  config,
  source,
  history,
  adapter,
  now = new Date(),
  signal,
}: RunCycleOptions): Promise<SyncSummary> {
  const summary: SyncSummary = {
    scanned: 0,
    synced: 0,
    skipped: 0,
    retry: 0,
    review: 0,
  };

  // A previous process can stop after Microsip commits but before local history
  // records the receipt. Resolve those writes before consulting today's API list.
  for (const entry of history.list()) {
    if (signal?.aborted) return summary;
    if (entry.status !== "submitting") continue;
    const result = await reconcileSubmitting(entry, config, history, adapter, now);
    if (result === "synced") summary.synced += 1;
    else if (result === "retry") summary.retry += 1;
    else summary.review += 1;
  }

  for await (const listedOrder of source.listOrders()) {
    if (signal?.aborted) break;
    summary.scanned += 1;

    if (listedOrder.organization_id !== config.organizationId) {
      summary.skipped += 1;
      continue;
    }
    if (!isEligible(listedOrder, config)) {
      summary.skipped += 1;
      continue;
    }

    const externalId = makeExternalId(config.organizationId, listedOrder.id);
    let entry = history.get(listedOrder.id);
    if (entry?.status === "synced" || entry?.status === "review") {
      summary.skipped += 1;
      continue;
    }
    if (entry?.status === "submitting") {
      // It was just reconciled above, but stores that return snapshots may not
      // reflect the updated value from list(); read the current entry again.
      entry = history.get(listedOrder.id) ?? entry;
      if (entry.status === "submitting") {
        summary.skipped += 1;
        continue;
      }
      if (entry.status === "synced" || entry.status === "review") {
        summary.skipped += 1;
        continue;
      }
    }
    if (entry?.externalId !== undefined && entry.externalId !== externalId) {
      saveReview(history, entry, config, listedOrder.id, entry.externalId, now,
        "Local history does not match this organization.");
      summary.review += 1;
      continue;
    }
    if (entry?.nextAttemptAt && Date.parse(entry.nextAttemptAt) > now.getTime()) {
      summary.skipped += 1;
      continue;
    }

    let freshOrder: Order;
    try {
      freshOrder = await source.getOrder(listedOrder.id);
    } catch {
      const outcome = recordPreWriteFailure(
        history,
        entry,
        config,
        listedOrder.id,
        externalId,
        now,
        safeRefreshError,
      );
      if (outcome === "review") summary.review += 1;
      else summary.retry += 1;
      continue;
    }

    if (
      freshOrder.id !== listedOrder.id ||
      freshOrder.organization_id !== config.organizationId ||
      !isEligible(freshOrder, config)
    ) {
      summary.skipped += 1;
      continue;
    }

    let payload: MicrosipOrder;
    try {
      payload = mapOrder(freshOrder, config);
      if (payload.externalId !== externalId) throw new MappingError();
    } catch {
      const outcome = recordPreWriteFailure(
        history,
        entry,
        config,
        listedOrder.id,
        externalId,
        now,
        safeMappingError,
      );
      if (outcome === "review") summary.review += 1;
      else summary.retry += 1;
      continue;
    }

    try {
      await adapter.validate(payload);
    } catch {
      const outcome = recordPreWriteFailure(
        history,
        entry,
        config,
        listedOrder.id,
        externalId,
        now,
        safeReadError,
        payload,
      );
      if (outcome === "review") summary.review += 1;
      else summary.retry += 1;
      continue;
    }

    if (signal?.aborted) break;
    const attempts = (entry?.attempts ?? 0) + 1;
    const submitting: HistoryEntry = {
      orderId: listedOrder.id,
      externalId,
      status: "submitting",
      attempts,
      updatedAt: now.toISOString(),
      payload,
    };
    // This durable marker must land before create: it is the restart recovery
    // anchor if the process dies after Microsip accepts the order.
    history.save(submitting);

    let receipt: Receipt;
    try {
      receipt = await adapter.create(payload);
    } catch {
      const outcome = await resolveCreateFailure(
        submitting,
        history,
        config,
        adapter,
        now,
        safeUnknownWriteError,
      );
      if (outcome === "synced") summary.synced += 1;
      else if (outcome === "retry") summary.retry += 1;
      else summary.review += 1;
      continue;
    }

    if (!isValidReceipt(receipt)) {
      const outcome = await resolveCreateFailure(
        submitting,
        history,
        config,
        adapter,
        now,
        safeMissingReceiptError,
      );
      if (outcome === "synced") summary.synced += 1;
      else if (outcome === "retry") summary.retry += 1;
      else summary.review += 1;
      continue;
    }

    history.save({
      ...submitting,
      status: "synced",
      updatedAt: now.toISOString(),
      receipt,
    });
    summary.synced += 1;
  }

  return summary;
}

function isEligible(order: Order, config: SyncConfig): boolean {
  if (order.origin !== "WHATSAPP") return false;
  if (!config.statuses.includes(order.status as "APPROVED" | "PENDING_REVIEW")) {
    return false;
  }
  const createdAt = Date.parse(order.created_at);
  const since = Date.parse(config.since);
  return Number.isFinite(createdAt) && Number.isFinite(since) && createdAt >= since;
}

function normalizeQuantity(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const text = String(value);
  // Reject exponent notation and more than three decimal places, preserving
  // the API's declared decimal precision instead of silently rounding it.
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(text)) return undefined;
  const quantity = Number(text);
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 999_999_999.999
  ) {
    return undefined;
  }
  return quantity;
}

function makeExternalId(organizationId: string, orderId: string): string {
  return `vegyfresh:${organizationId}:${orderId}`;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidReceipt(receipt: Receipt | undefined): receipt is Receipt {
  return Boolean(
    receipt &&
      nonEmptyString(receipt.folio) &&
      nonEmptyString(receipt.recordedAt) &&
      Number.isFinite(Date.parse(receipt.recordedAt)),
  );
}

function retryAt(now: Date, attempts: number, config: SyncConfig): string {
  const maxDelayMs = 30 * 24 * 60 * 60 * 1000;
  const exponent = Math.max(0, Math.min(attempts - 1, 30));
  const configuredDelay = Number.isFinite(config.retryDelayMs)
    ? Math.max(0, Math.min(config.retryDelayMs, maxDelayMs))
    : maxDelayMs;
  const delay = Math.min(configuredDelay * 2 ** exponent, maxDelayMs);
  const maxDateMs = 8_640_000_000_000_000;
  return new Date(Math.min(now.getTime() + delay, maxDateMs)).toISOString();
}

function recordPreWriteFailure(
  history: HistoryStore,
  previous: HistoryEntry | undefined,
  config: SyncConfig,
  orderId: string,
  externalId: string,
  now: Date,
  error: string,
  payload?: MicrosipOrder,
): "retry" | "review" {
  const attempts = (previous?.attempts ?? 0) + 1;
  const review = attempts >= config.maxAttempts;
  history.save({
    orderId,
    externalId,
    status: review ? "review" : "retry",
    attempts,
    updatedAt: now.toISOString(),
    ...(review ? {} : { nextAttemptAt: retryAt(now, attempts, config) }),
    ...(payload ? { payload } : previous?.payload ? { payload: previous.payload } : {}),
    error,
  });
  return review ? "review" : "retry";
}

async function reconcileSubmitting(
  entry: HistoryEntry,
  config: SyncConfig,
  history: HistoryStore,
  adapter: MicrosipAdapter,
  now: Date,
): Promise<"synced" | "retry" | "review"> {
  const expectedExternalId = makeExternalId(config.organizationId, entry.orderId);
  if (
    entry.externalId !== expectedExternalId ||
    !isSafeStoredPayload(entry.payload, config, expectedExternalId)
  ) {
    saveReview(
      history,
      entry,
      config,
      entry.orderId,
      entry.externalId,
      now,
      "Local submission could not be safely reconciled.",
    );
    return "review";
  }

  let result: LookupResult;
  try {
    result = normalizeLookupResult(
      await adapter.lookup(entry.externalId, config.company),
    );
  } catch {
    result = { status: "unknown" };
  }
  return storeLookupResult(entry, result, history, config, now);
}

async function resolveCreateFailure(
  entry: HistoryEntry,
  history: HistoryStore,
  config: SyncConfig,
  adapter: MicrosipAdapter,
  now: Date,
  error: string,
): Promise<"synced" | "retry" | "review"> {
  let result: LookupResult;
  try {
    result = normalizeLookupResult(
      await adapter.lookup(entry.externalId, config.company),
    );
  } catch {
    result = { status: "unknown" };
  }
  return storeLookupResult(entry, result, history, config, now, error);
}

function storeLookupResult(
  entry: HistoryEntry,
  result: LookupResult,
  history: HistoryStore,
  config: SyncConfig,
  now: Date,
  absentError = "Microsip confirmed that the order was not recorded.",
): "synced" | "retry" | "review" {
  if (result.status === "found") {
    if (!isValidReceipt(result.receipt)) {
      saveReview(
        history,
        entry,
        config,
        entry.orderId,
        entry.externalId,
        now,
        safeUnknownWriteError,
      );
      return "review";
    }
    history.save({
      ...entry,
      status: "synced",
      updatedAt: now.toISOString(),
      receipt: result.receipt,
    });
    return "synced";
  }

  if (result.status === "absent") {
    const review = entry.attempts >= config.maxAttempts;
    history.save({
      ...entry,
      status: review ? "review" : "retry",
      updatedAt: now.toISOString(),
      ...(review ? { nextAttemptAt: undefined } : {
        nextAttemptAt: retryAt(now, entry.attempts, config),
      }),
      error: review ? safeUnknownWriteError : absentError,
    });
    return review ? "review" : "retry";
  }

  saveReview(
    history,
    entry,
    config,
    entry.orderId,
    entry.externalId,
    now,
    safeUnknownWriteError,
  );
  return "review";
}

function normalizeLookupResult(value: unknown): LookupResult {
  if (!value || typeof value !== "object") return { status: "unknown" };
  const candidate = value as { status?: unknown; receipt?: unknown };
  if (candidate.status === "absent" || candidate.status === "unknown") {
    return { status: candidate.status };
  }
  if (candidate.status === "found") {
    return { status: "found", receipt: candidate.receipt as Receipt };
  }
  return { status: "unknown" };
}

function saveReview(
  history: HistoryStore,
  previous: HistoryEntry | undefined,
  _config: SyncConfig,
  orderId: string,
  externalId: string,
  now: Date,
  error: string,
): void {
  history.save({
    orderId,
    externalId,
    status: "review",
    attempts: previous?.attempts ?? 0,
    updatedAt: now.toISOString(),
    ...(previous?.payload ? { payload: previous.payload } : {}),
    error,
  });
}

function isSafeStoredPayload(
  payload: MicrosipOrder | undefined,
  config: SyncConfig,
  externalId: string,
): payload is MicrosipOrder {
  return Boolean(
    payload &&
      payload.externalId === externalId &&
      payload.company === config.company &&
      payload.branch === config.branch &&
      payload.warehouse === config.warehouse &&
      nonEmptyString(payload.customerKey) &&
      Array.isArray(payload.lines) &&
      payload.lines.length > 0 &&
      payload.lines.every(
        (line) =>
          nonEmptyString(line.productKey) &&
          nonEmptyString(line.unit) &&
          Number.isFinite(line.quantity) &&
          line.quantity > 0,
      ),
  );
}

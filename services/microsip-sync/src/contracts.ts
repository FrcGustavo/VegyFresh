import type { Order } from "@vegyfresh/api-client";

export interface SyncConfig {
  apiBaseUrl: string;
  organizationId: string;
  company: string;
  branch: string;
  warehouse: string;
  since: string;
  statuses: ("APPROVED" | "PENDING_REVIEW")[];
  pageSize: number;
  pollIntervalMs: number;
  retryDelayMs: number;
  maxAttempts: number;
  dataDir: string;
  adapter: { mode: "simulator" } | { mode: "module"; modulePath: string };
  clients: Record<string, string>;
  units: Record<string, string>;
}

export interface MicrosipOrder {
  externalId: string;
  company: string;
  branch: string;
  warehouse: string;
  customerKey: string;
  lines: { productKey: string; unit: string; quantity: number }[];
}

export interface Receipt { folio: string; recordedAt: string }
export type LookupResult =
  | { status: "found"; receipt: Receipt }
  | { status: "absent" }
  | { status: "unknown" };

// "absent" promises that an earlier timed-out write cannot commit later.
export interface MicrosipAdapter {
  validate(order: MicrosipOrder): Promise<void>;
  create(order: MicrosipOrder): Promise<Receipt>;
  lookup(externalId: string, company: string): Promise<LookupResult>;
  close?(): void | Promise<void>;
}

export type HistoryStatus = "retry" | "submitting" | "synced" | "review";
export interface HistoryEntry {
  orderId: string;
  externalId: string;
  status: HistoryStatus;
  attempts: number;
  updatedAt: string;
  nextAttemptAt?: string;
  receipt?: Receipt;
  error?: string;
  payload?: MicrosipOrder;
}

export interface HistoryStore {
  get(orderId: string): HistoryEntry | undefined;
  list(): HistoryEntry[];
  save(entry: HistoryEntry): void;
  close(): void;
}

export interface OrderSource {
  listOrders(): AsyncIterable<Order>;
  getOrder(id: string): Promise<Order>;
}

export interface SyncSummary {
  scanned: number;
  synced: number;
  skipped: number;
  retry: number;
  review: number;
}

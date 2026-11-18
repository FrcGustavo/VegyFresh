import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import type { SyncConfig } from "./contracts.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function invalid(message: string): never {
  throw new Error(`Invalid Microsip sync config: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) invalid(`${label} contains unsupported field(s)`);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    invalid(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function positiveInteger(value: unknown, field: string, maximum?: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    (maximum !== undefined && value > maximum)
  ) {
    invalid(`${field} must be a positive integer${maximum ? ` no greater than ${maximum}` : ""}`);
  }
  return value;
}

function uuid(value: unknown, field: string): string {
  const result = requiredString(value, field);
  if (!UUID_PATTERN.test(result)) invalid(`${field} must be a UUID`);
  return result;
}

function resolveFromConfigDirectory(value: string, configPath: string): string {
  return isAbsolute(value)
    ? resolve(value)
    : resolve(dirname(resolve(configPath)), value);
}

function readStringMap(value: unknown, field: string): Record<string, string> {
  if (!isRecord(value)) invalid(`${field} must be an object`);
  const entries = Object.entries(value);
  if (entries.length === 0) invalid(`${field} must contain at least one mapping`);
  const result = Object.fromEntries(
    entries.map(([key, mappedValue]) => {
      if (key.trim() === "") invalid(`${field} keys must be non-empty strings`);
      return [key, requiredString(mappedValue, `${field}.${key}`)];
    }),
  );
  return result;
}

function readStatuses(value: unknown): SyncConfig["statuses"] {
  if (value === undefined) return ["APPROVED"];
  if (!Array.isArray(value) || value.length === 0) {
    invalid("statuses must be a non-empty array");
  }

  const statuses: SyncConfig["statuses"] = [];
  for (const status of value) {
    if (status !== "APPROVED" && status !== "PENDING_REVIEW") {
      invalid("statuses may contain only APPROVED and PENDING_REVIEW");
    }
    if (statuses.includes(status)) invalid("statuses must not contain duplicates");
    statuses.push(status);
  }
  return statuses;
}

function readSince(value: unknown): string {
  const since = requiredString(value, "since");
  if (!UTC_TIMESTAMP_PATTERN.test(since)) {
    invalid("since must be an ISO 8601 UTC timestamp ending in Z");
  }
  const parsed = new Date(since);
  if (!Number.isFinite(parsed.getTime())) {
    invalid("since must be a valid ISO 8601 UTC timestamp");
  }
  const [datePart, timePart] = since.slice(0, -1).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map((part) => Number(part.split(".")[0]));
  const calendarDate = new Date(`${datePart}T00:00:00.000Z`);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== datePart ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    invalid("since must be a valid ISO 8601 UTC timestamp");
  }
  return since;
}

function readAdapter(value: unknown, configPath: string): SyncConfig["adapter"] {
  if (!isRecord(value)) invalid("adapter must be an object");
  const mode = requiredString(value.mode, "adapter.mode");
  if (mode === "simulator") {
    assertOnlyKeys(value, ["mode"], "adapter");
    return { mode };
  }
  if (mode === "module") {
    assertOnlyKeys(value, ["mode", "modulePath"], "adapter");
    return {
      mode,
      modulePath: resolveFromConfigDirectory(
        requiredString(value.modulePath, "adapter.modulePath"),
        configPath,
      ),
    };
  }
  invalid("adapter.mode must be simulator or module");
}

export function loadConfig(path: string): SyncConfig {
  const configPath = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    invalid("file could not be read or is not valid JSON");
  }

  if (!isRecord(parsed)) invalid("root value must be an object");
  assertOnlyKeys(
    parsed,
    [
      "apiBaseUrl",
      "organizationId",
      "company",
      "branch",
      "warehouse",
      "since",
      "statuses",
      "pageSize",
      "pollIntervalMs",
      "retryDelayMs",
      "maxAttempts",
      "dataDir",
      "adapter",
      "clients",
      "units",
    ],
    "root config",
  );

  const apiBaseUrl = requiredString(parsed.apiBaseUrl, "apiBaseUrl");
  let apiUrl: URL;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    invalid("apiBaseUrl must be an absolute HTTP(S) URL");
  }
  if (
    (apiUrl.protocol !== "http:" && apiUrl.protocol !== "https:") ||
    apiUrl.username !== "" ||
    apiUrl.password !== "" ||
    apiUrl.search !== "" ||
    apiUrl.hash !== ""
  ) {
    invalid("apiBaseUrl must be an HTTP(S) URL without credentials, query, or fragment");
  }

  const clients = readStringMap(parsed.clients, "clients");
  for (const clientId of Object.keys(clients)) {
    if (!UUID_PATTERN.test(clientId)) invalid("clients keys must be client UUIDs");
  }

  const units = readStringMap(parsed.units, "units");
  if (
    Object.keys(units).length !== 2 ||
    !Object.hasOwn(units, "kg") ||
    !Object.hasOwn(units, "pz")
  ) {
    invalid("units must map both kg and pz to Microsip units");
  }

  return {
    apiBaseUrl: apiUrl.toString().replace(/\/$/, ""),
    organizationId: uuid(parsed.organizationId, "organizationId"),
    company: requiredString(parsed.company, "company"),
    branch: requiredString(parsed.branch, "branch"),
    warehouse: requiredString(parsed.warehouse, "warehouse"),
    since: readSince(parsed.since),
    statuses: readStatuses(parsed.statuses),
    pageSize: positiveInteger(parsed.pageSize, "pageSize", 1000),
    pollIntervalMs: positiveInteger(parsed.pollIntervalMs, "pollIntervalMs", 2_147_483_647),
    retryDelayMs: positiveInteger(parsed.retryDelayMs, "retryDelayMs", 2_147_483_647),
    maxAttempts: positiveInteger(parsed.maxAttempts, "maxAttempts", 100),
    dataDir: resolveFromConfigDirectory(
      requiredString(parsed.dataDir, "dataDir"),
      configPath,
    ),
    adapter: readAdapter(parsed.adapter, configPath),
    clients,
    units,
  };
}

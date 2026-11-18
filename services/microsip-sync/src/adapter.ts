import { pathToFileURL } from "node:url";
import type { MicrosipAdapter, SyncConfig } from "./contracts.js";
import { SimulatorAdapter } from "./simulator.js";

async function bounded<T>(operation: () => Promise<T>, timeoutMs: number, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          onTimeout?.();
          reject(new Error("Microsip adapter timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function loadAdapter(config: SyncConfig, timeoutMs = 30_000): Promise<MicrosipAdapter> {
  if (config.adapter.mode === "simulator") return boundAdapter(new SimulatorAdapter(config.dataDir));
  const modulePath = config.adapter.modulePath;
  let expired = false;
  const adapter = await bounded(async () => {
    const driver = await import(pathToFileURL(modulePath).href);
    if (typeof driver.createAdapter !== "function") throw new Error("El módulo debe exportar createAdapter(config)");
    const instance: MicrosipAdapter = await driver.createAdapter(config);
    if (expired) {
      void Promise.resolve().then(() => instance?.close?.()).catch(() => {});
      throw new Error("Microsip adapter initialization expired");
    }
    if (!instance || [instance.validate, instance.create, instance.lookup].some(fn => typeof fn !== "function")) {
      throw new Error("El módulo no implementa validate, create y lookup");
    }
    return instance;
  }, timeoutMs, () => { expired = true; });
  return boundAdapter(adapter, timeoutMs);
}

export function boundAdapter(adapter: MicrosipAdapter, timeoutMs = 30_000): MicrosipAdapter {
  const uncertain = new Set<string>();
  const key = (externalId: string, company: string) => JSON.stringify([company, externalId]);
  return {
    validate: order => bounded(() => adapter.validate(order), timeoutMs),
    create: order => bounded(() => adapter.create(order), timeoutMs, () => uncertain.add(key(order.externalId, order.company))),
    async lookup(externalId, company) {
      const result = await bounded(() => adapter.lookup(externalId, company), timeoutMs);
      // The timed-out call may still commit. An absent response cannot authorize
      // a second write while that operation is outstanding in this process.
      if (result?.status === "absent" && uncertain.has(key(externalId, company))) return { status: "unknown" };
      return result;
    },
    close: async () => { await bounded(async () => { await adapter.close?.(); }, timeoutMs); },
  };
}

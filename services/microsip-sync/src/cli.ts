import { setTimeout as delay } from "node:timers/promises";
import { loadConfig } from "./config.js";
import { createOrderSource } from "./source.js";
import { openHistory, readHistory } from "./history.js";
import { loadAdapter } from "./adapter.js";
import { runCycle } from "./engine.js";
import type { HistoryEntry, HistoryStore, SyncConfig } from "./contracts.js";

const usage = "Uso: <run|once|history|resolve ID FOLIO|retry ID --confirmed-absent> --config archivo.json";

// Keep simulated and real histories distinct: a SIM receipt must never suppress a real order.
function bindAdapter(history: HistoryStore, config: SyncConfig) {
  const identity = config.adapter.mode === "simulator" ? "simulator" : `module:${config.adapter.modulePath}`;
  const prior = history.get("__adapter_identity__");
  if (prior && prior.externalId !== identity) {
    throw new Error("Usa otro dataDir para cambiar de adaptador");
  }
  if (!prior) history.save({
    orderId: "__adapter_identity__", externalId: identity,
    status: "synced", attempts: 0, updatedAt: new Date().toISOString(),
  });
}

export async function runCli(args: string[], signal?: AbortSignal): Promise<void> {
  const configIndex = args.indexOf("--config");
  if (configIndex < 1 || !args[configIndex + 1] || args.length !== configIndex + 2) throw new Error(usage);
  const [command, ...parameters] = args.slice(0, configIndex);
  if (!["run", "once", "history", "resolve", "retry"].includes(command!)) throw new Error(usage);
  if ((["run", "once", "history"].includes(command!) && parameters.length) ||
    (["resolve", "retry"].includes(command!) && parameters.length !== 2)) throw new Error(usage);
  const config = loadConfig(args[configIndex + 1]!);
  if (command === "history") {
    const entries = readHistory(config.dataDir, config.company, config.organizationId);
    const identity = config.adapter.mode === "simulator" ? "simulator" : `module:${config.adapter.modulePath}`;
    if (entries.find(entry => entry.orderId === "__adapter_identity__")?.externalId !== identity) {
      throw new Error("Usa otro dataDir para cambiar de adaptador");
    }
    console.log(JSON.stringify(entries.filter(entry => entry.orderId !== "__adapter_identity__")
      .map(({ payload: _payload, ...entry }) => entry), null, 2));
    return;
  }
  const history = openHistory(config.dataDir, config.company, config.organizationId);
  try {
    bindAdapter(history, config);
    if (command === "resolve" || command === "retry") {
      const entry = history.get(parameters[0]!);
      if (!entry || entry.orderId === "__adapter_identity__" || entry.status === "synced") {
        throw new Error("Pedido inexistente o ya sincronizado");
      }
      const updatedAt = new Date().toISOString();
      let result: HistoryEntry;
      if (command === "resolve") {
        const folio = parameters[1]!.trim();
        if (!folio) throw new Error(usage);
        result = { ...entry, status: "synced", updatedAt, error: undefined,
          nextAttemptAt: undefined, receipt: { folio, recordedAt: updatedAt } };
      } else {
        if (parameters[1] !== "--confirmed-absent" || entry.status === "submitting") {
          throw new Error("Reintento requiere revisión resuelta y --confirmed-absent");
        }
        result = { ...entry, status: "retry", attempts: 0, updatedAt,
          error: "Ausencia confirmada manualmente por el operador", nextAttemptAt: updatedAt };
      }
      history.save(result);
      console.log(JSON.stringify({ orderId: result.orderId, status: result.status }));
      return;
    }
    const adapter = await loadAdapter(config);
    try {
      const source = createOrderSource(config);
      do {
        if (signal?.aborted) break;
        try {
          console.log(JSON.stringify(await runCycle({ config, source, history, adapter, signal })));
        } catch {
          if (command === "once") throw new Error("Falló el ciclo; consulta la configuración y conectividad");
          console.error("Falló el ciclo; se reintentará en el siguiente intervalo");
        }
        if (command === "once") break;
        try { await delay(config.pollIntervalMs, undefined, { signal }); }
        catch (error) { if (!signal?.aborted) throw error; }
      } while (!signal?.aborted);
    } finally { await adapter.close?.(); }
  } finally { history.close(); }
}

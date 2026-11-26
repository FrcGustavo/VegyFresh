import {
  ApiClientError,
  createApiClient,
  createFetchTransport,
} from "@vegyfresh/api-client";
import { loadSeedConfig } from "./config/seed-config.js";
import { SeedRepository } from "./repositories/seed.repository.js";
import { SeedOrchestrator } from "./services/seed-orchestrator.js";

export async function main() {
  const config = loadSeedConfig();
  console.log(`[seed] API destino: ${config.baseUrl}`);
  const api = createApiClient({
    request: createFetchTransport({
      baseUrl: config.baseUrl,
      token: config.token,
    }),
  });
  return new SeedOrchestrator(new SeedRepository(api), config).run();
}

main().catch((error: unknown) => {
  console.error("\n[seed] Error ejecutando seed");
  console.error(error instanceof Error ? error.message : error);
  const cause = error instanceof Error ? error.cause : null;
  if (cause instanceof ApiClientError) {
    console.error(`[seed] HTTP ${cause.status}`, cause.payload);
  }
  process.exitCode = 1;
});

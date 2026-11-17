import {
  ApiClientError,
  createApiClient,
  createFetchTransport,
} from "@vegyfresh/api-client";
import { createKeycloakTokenProvider } from "./auth/keycloak-token-provider.js";
import { loadSeedConfig } from "./config/seed-config.js";
import { SeedRepository } from "./repositories/seed.repository.js";
import { SeedOrchestrator } from "./services/seed-orchestrator.js";

export async function main() {
  const config = loadSeedConfig();
  console.log(`[seed] API destino: ${config.baseUrl}`);
  const token = config.token ??
    (config.keycloak
      ? createKeycloakTokenProvider(config.keycloak)
      : undefined);
  if (!token) throw new Error("No se configuró la autenticación del seed");

  const api = createApiClient({
    request: createFetchTransport({
      baseUrl: config.baseUrl,
      token,
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

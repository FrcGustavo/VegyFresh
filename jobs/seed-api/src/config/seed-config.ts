export interface SeedConfig {
  baseUrl: string;
  token: string;
  concurrency: number;
  transactionalConcurrency: number;
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Se esperaba un entero positivo y se recibió: ${value}`);
  }
  return parsed;
};

export function loadSeedConfig(env = process.env): SeedConfig {
  const token = env.SEED_API_BEARER_TOKEN?.trim();
  if (!token) throw new Error("Configura SEED_API_BEARER_TOKEN con un access token válido");

  return {
    baseUrl: normalizeBaseUrl(
      env.SEED_API_BASE_URL ?? "http://localhost:3000/api/v1",
    ),
    token,
    concurrency: positiveInteger(env.SEED_CONCURRENCY, 10),
    transactionalConcurrency: positiveInteger(
      env.SEED_TRANSACTIONAL_CONCURRENCY,
      3,
    ),
  };
}

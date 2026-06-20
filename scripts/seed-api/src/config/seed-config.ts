export interface SeedConfig {
  baseUrl: string;
  token: string;
  adminPassword: string;
  operatorPassword: string;
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
  if (!token) {
    throw new Error("SEED_API_BEARER_TOKEN es obligatorio");
  }

  return {
    baseUrl: normalizeBaseUrl(
      env.SEED_API_BASE_URL ?? "http://localhost:3000/api/v1",
    ),
    token,
    adminPassword: env.SEED_ADMIN_PASSWORD ?? "seed_admin_password_change_me",
    operatorPassword:
      env.SEED_OPERATOR_PASSWORD ?? "seed_operator_password_change_me",
    concurrency: positiveInteger(env.SEED_CONCURRENCY, 10),
    transactionalConcurrency: positiveInteger(
      env.SEED_TRANSACTIONAL_CONCURRENCY,
      3,
    ),
  };
}

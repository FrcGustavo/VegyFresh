export interface SeedConfig {
  baseUrl: string;
  token?: string;
  keycloak?: {
    tokenUrl: string;
    clientId: string;
    username: string;
    password: string;
  };
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
  const token = env.SEED_API_BEARER_TOKEN?.trim() || undefined;
  const username = env.SEED_KEYCLOAK_USERNAME?.trim();
  const password = env.SEED_KEYCLOAK_PASSWORD;
  let keycloak: SeedConfig["keycloak"];

  if (!token) {
    if (!username || !password) {
      throw new Error(
        "Configura SEED_API_BEARER_TOKEN o SEED_KEYCLOAK_USERNAME y SEED_KEYCLOAK_PASSWORD",
      );
    }

    const tokenUrl =
      env.SEED_KEYCLOAK_TOKEN_URL?.trim() ||
      "http://host.docker.internal:8080/realms/vegyfresh/protocol/openid-connect/token";
    const parsedTokenUrl = new URL(tokenUrl);
    if (!["http:", "https:"].includes(parsedTokenUrl.protocol)) {
      throw new Error("SEED_KEYCLOAK_TOKEN_URL debe usar HTTP o HTTPS");
    }

    keycloak = {
      tokenUrl,
      clientId: env.SEED_KEYCLOAK_CLIENT_ID?.trim() || "vegyfresh-admin",
      username,
      password,
    };
  }

  return {
    baseUrl: normalizeBaseUrl(
      env.SEED_API_BASE_URL ?? "http://localhost:3000/api/v1",
    ),
    token,
    keycloak,
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

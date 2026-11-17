interface KeycloakTokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
}

export interface KeycloakTokenProviderConfig {
  tokenUrl: string;
  clientId: string;
  username: string;
  password: string;
}

class KeycloakTokenError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function errorCode(payload: KeycloakTokenResponse | null) {
  return typeof payload?.error === "string" ? payload.error : undefined;
}

function errorDescription(payload: KeycloakTokenResponse | null) {
  return typeof payload?.error_description === "string"
    ? payload.error_description
    : undefined;
}

export function createKeycloakTokenProvider(
  config: KeycloakTokenProviderConfig,
  fetchImpl: typeof fetch = fetch,
): () => Promise<string> {
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let refreshAt = 0;
  let pending: Promise<string> | undefined;

  const requestToken = async (parameters: URLSearchParams) => {
    parameters.set("client_id", config.clientId);
    const response = await fetchImpl(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters,
    });
    const payload = (await response.json().catch(() => null)) as
      | KeycloakTokenResponse
      | null;

    if (!response.ok) {
      const code = errorCode(payload);
      const description = errorDescription(payload);
      throw new KeycloakTokenError(
        description
          ? `Keycloak rechazó la autenticación: ${description}`
          : `Keycloak rechazó la autenticación (HTTP ${response.status})`,
        code,
      );
    }

    if (
      typeof payload?.access_token !== "string" ||
      typeof payload.expires_in !== "number" ||
      !Number.isFinite(payload.expires_in) ||
      payload.expires_in <= 0
    ) {
      throw new KeycloakTokenError(
        "Keycloak respondió sin un access token válido",
      );
    }

    return {
      accessToken: payload.access_token,
      refreshToken:
        typeof payload.refresh_token === "string"
          ? payload.refresh_token
          : undefined,
      expiresIn: payload.expires_in,
    };
  };

  const storeToken = (tokens: Awaited<ReturnType<typeof requestToken>>) => {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken ?? refreshToken;
    const refreshBufferMs = Math.min(30_000, tokens.expiresIn * 100);
    refreshAt = Date.now() + tokens.expiresIn * 1_000 - refreshBufferMs;
    return accessToken;
  };

  const authenticate = async () => {
    if (refreshToken) {
      try {
        const tokens = await requestToken(
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        );
        return storeToken(tokens);
      } catch (error) {
        if (!(error instanceof KeycloakTokenError) || error.code !== "invalid_grant") {
          throw error;
        }
        refreshToken = undefined;
      }
    }

    const tokens = await requestToken(
      new URLSearchParams({
        grant_type: "password",
        username: config.username,
        password: config.password,
        scope: "openid profile email vegyfresh-api",
      }),
    );
    return storeToken(tokens);
  };

  return async () => {
    if (accessToken && Date.now() < refreshAt) return accessToken;
    if (!pending) {
      pending = authenticate().finally(() => {
        pending = undefined;
      });
    }
    return pending;
  };
}

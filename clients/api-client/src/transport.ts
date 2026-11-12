export type ApiRequest = <Response>(
  path: string,
  options?: RequestInit,
) => Promise<Response | null>;

export interface ApiErrorPayload {
  message?: string | string[];
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

type TokenProvider =
  | string
  | null
  | undefined
  | (() => string | null | undefined | Promise<string | null | undefined>);

export interface FetchTransportOptions {
  baseUrl: string;
  token?: TokenProvider;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
}

const parseJson = async <Payload>(response: globalThis.Response) => {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as Payload;
  } catch {
    throw new ApiClientError("Respuesta inválida del servidor", response.status, null);
  }
};

const resolveToken = async (token: TokenProvider) =>
  typeof token === "function" ? token() : token;

export function createFetchTransport({
  baseUrl,
  token,
  fetch: fetchImplementation = globalThis.fetch,
  headers: defaultHeaders,
}: FetchTransportOptions): ApiRequest {
  if (!fetchImplementation) {
    throw new Error("No existe una implementación de fetch disponible");
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return async <Response>(path: string, options?: RequestInit) => {
    const headers = new Headers(defaultHeaders);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    headers.set("Accept", "application/json");

    const body = options?.body;
    const isNativeBody =
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob;
    if (body != null && !isNativeBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const accessToken = await resolveToken(token);
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetchImplementation(`${normalizedBaseUrl}${path}`, {
      ...options,
      headers,
    });
    const responseBody = await parseJson<Response | ApiErrorPayload>(response);

    if (!response.ok) {
      const payload = responseBody as ApiErrorPayload | null;
      const rawMessage = payload?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : (rawMessage ?? `Error HTTP ${response.status}`);
      throw new ApiClientError(message, response.status, payload);
    }

    return responseBody as Response | null;
  };
}

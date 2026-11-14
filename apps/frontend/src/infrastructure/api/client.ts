export interface ApiErrorPayload {
  message?: string;
}

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Respuesta inválida del servidor");
  }
};

function buildHeaders(options?: RequestInit): Headers {
  const headers = new Headers(options?.headers);
  const body = options?.body;
  if (body !== undefined && body !== null && !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) && !(body instanceof Blob) &&
      !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.delete("Authorization");
  return headers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApi<T = any>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    credentials: "same-origin",
    headers: buildHeaders(options),
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
    const error = await parseJson<ApiErrorPayload>(response).catch(() => null);
    throw new Error(error?.message || "Error en la petición");
  }
  return response.status === 204 ? null : parseJson<T>(response);
}

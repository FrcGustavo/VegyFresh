import { createOrdersApi } from "./createOrdersApi";

export class PortalOrdersError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// This adapter runs in the browser after hydration. The BFF owns all credentials.
export const startOrdersApi = createOrdersApi(async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`/api/v1${path}`, {
    signal: options?.signal,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try { payload = JSON.parse(text); } catch {
      if (response.ok) throw new Error("Invalid response from server");
    }
  }
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
      ? payload.message : "Request failed";
    throw new PortalOrdersError(message, response.status);
  }
  return payload as T;
});

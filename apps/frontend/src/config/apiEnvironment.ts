const LOCAL_API_URL = "http://localhost:3000/api/v1";

type RuntimeConfig = {
  API_URL?: string;
};

declare global {
  interface Window {
    __VEGYFRESH_CONFIG__?: RuntimeConfig;
  }
}

export function resolveApiUrl(runtimeUrl?: string, buildUrl?: string): string {
  const configuredUrl = runtimeUrl?.trim() || buildUrl?.trim() || LOCAL_API_URL;
  return configuredUrl.replace(/\/+$/, "");
}

export const API_URL = resolveApiUrl(
  typeof window === "undefined"
    ? undefined
    : window.__VEGYFRESH_CONFIG__?.API_URL,
  import.meta.env.VITE_API_URL,
);

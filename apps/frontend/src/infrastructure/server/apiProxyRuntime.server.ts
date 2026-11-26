import { adminRoutes } from "./adminRoutes.mjs";
import {
  createBffProxyCache,
  createConfigFingerprint,
  type ApiProxy,
} from "./apiProxy.mjs";

type ServerEnvironment = Record<string, string | undefined>;
type ProcessGlobal = typeof globalThis & {
  process?: { env?: ServerEnvironment };
};

const getCachedBffProxy = createBffProxyCache();

export function getServerEnvironment(): ServerEnvironment {
  return (globalThis as ProcessGlobal).process?.env ?? {};
}

function isLoopback(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    (ipv4 !== null &&
      Number(ipv4[1]) === 127 &&
      ipv4.slice(1).every((part) => Number(part) <= 255)) ||
    host === "::1"
  );
}

export function getPublicOrigin() {
  const configured = getServerEnvironment().VEGYFRESH_PUBLIC_ORIGIN?.trim();
  const value = configured || (import.meta.env.DEV ? "http://localhost:5173" : undefined);
  if (!value) {
    throw new Error("VEGYFRESH_PUBLIC_ORIGIN is required in production.");
  }
  const url = new URL(value);
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !["http:", "https:"].includes(url.protocol) ||
    (url.protocol === "http:" && !isLoopback(url.hostname))
  ) {
    throw new Error(
      "VEGYFRESH_PUBLIC_ORIGIN must be a canonical HTTP(S) origin and use HTTPS outside loopback.",
    );
  }
  return url.origin;
}

export function createApiProxy(): ApiProxy {
  const env = getServerEnvironment();
  const apiBaseUrl = env.VEGYFRESH_API_URL?.trim() ||
    "http://localhost:3000";
  const publicOrigin = getPublicOrigin();

  const issuer = env.OIDC_ISSUER?.trim();
  const clientId = env.OIDC_CLIENT_ID?.trim();
  const clientSecret = env.OIDC_CLIENT_SECRET || undefined;
  const sessionSecret = env.VEGYFRESH_SESSION_SECRET;
  if (!issuer || !clientId || !clientSecret || !env.OIDC_API_AUDIENCE?.trim() || !sessionSecret || !env.OIDC_PROVISIONING_SECRET || new TextEncoder().encode(env.OIDC_PROVISIONING_SECRET).length < 32) {
    throw new Error("OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_API_AUDIENCE, OIDC_PROVISIONING_SECRET (at least 32 bytes), and VEGYFRESH_SESSION_SECRET are required.");
  }

  const options = {
    apiBaseUrl,
    openapiPaths: adminRoutes,
    publicOrigin,
    issuer,
    clientId,
    clientSecret,
    apiAudience: env.OIDC_API_AUDIENCE?.trim(),
    apiResourceParameter: env.OIDC_API_RESOURCE_PARAMETER?.trim() || undefined,
    provisioningSecret: env.OIDC_PROVISIONING_SECRET,
    signupHint: env.OIDC_SIGNUP_HINT === "" ? "" : env.OIDC_SIGNUP_HINT?.trim() || "signup",
    sessionSecret,
    internalIssuerUrl: env.OIDC_INTERNAL_URL?.trim() || undefined,
    application: "admin" as const,
    profilePath: "/api/v1/auth/me",
    scopes: "openid profile email offline_access",
  };
  const fingerprint = createConfigFingerprint([
    apiBaseUrl,
    publicOrigin,
    issuer,
    clientId,
    clientSecret,
    sessionSecret,
    options.apiAudience,
    options.apiResourceParameter,
    options.provisioningSecret,
    options.signupHint,
    options.internalIssuerUrl,
  ]);
  return getCachedBffProxy(fingerprint, options);
}

export async function handleProxyRequest(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const publicOrigin = getPublicOrigin();
    if (requestUrl.username || requestUrl.password) {
      return new Response(
        request.method === "HEAD"
          ? null
          : JSON.stringify({ statusCode: 400, message: "Invalid request origin" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
            Vary: "Cookie",
          },
        },
      );
    }
    const canonicalRequest = new Request(
      new URL(requestUrl.pathname + requestUrl.search, publicOrigin),
      request,
    );
    return await createApiProxy().handle(canonicalRequest);
  } catch {
    return new Response(
      request.method === "HEAD"
        ? null
        : JSON.stringify({
            statusCode: 503,
            message: "The API proxy is temporarily unavailable.",
          }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
        },
      },
    );
  }
}

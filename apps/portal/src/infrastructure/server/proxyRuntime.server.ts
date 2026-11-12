import { createHash } from "node:crypto";
import type {
  PortalClientProfile,
  PortalSessionSnapshot,
} from "../../domain/auth/auth.types";
import { createBffProxy } from "./proxy.mjs";
import { portalRoutes } from "./routes";

type ServerEnvironment = Record<string, string | undefined>;

type SessionResult = {
  authenticated: boolean | null;
  cookies: string[];
  profile?: unknown;
};

export type PortalProxy = {
  handle: (request: Request) => Promise<Response>;
  getSession: (input: {
    cookieHeader?: string | null;
    origin: string;
  }) => Promise<SessionResult>;
  publicOrigin: string;
};

function getPublicOrigin(env: ServerEnvironment) {
  const port = env.PORT || "5174";
  const value = env.VEGYFRESH_PUBLIC_ORIGIN ||
    (env.NODE_ENV === "production" ? undefined : `http://localhost:${port}`);
  if (!value) throw new Error("VEGYFRESH_PUBLIC_ORIGIN is required.");

  const url = new URL(value);
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    throw new Error("VEGYFRESH_PUBLIC_ORIGIN must be a canonical HTTP(S) origin.");
  }
  if (
    env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("VEGYFRESH_PUBLIC_ORIGIN requires HTTPS outside loopback.");
  }
  return value;
}

function sessionProfile(profile: unknown): PortalClientProfile | undefined {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return undefined;
  }
  const client = (profile as { client?: unknown }).client;
  if (!client || typeof client !== "object" || Array.isArray(client)) {
    return undefined;
  }
  const value = client as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !(typeof value.email === "string" || value.email === null) ||
    value.portalEnabled !== true
  ) {
    return undefined;
  }
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    portalEnabled: value.portalEnabled,
  };
}

export function createPortalProxy({
  env = process.env,
  fetchImpl = fetch,
}: {
  env?: ServerEnvironment;
  fetchImpl?: typeof fetch;
} = {}): PortalProxy {
  if (env.AUTH_PROVIDER && env.AUTH_PROVIDER !== "keycloak") {
    throw new Error("AUTH_PROVIDER must be keycloak; local authentication is not supported.");
  }

  const publicOrigin = getPublicOrigin(env);
  const apiBaseUrl = env.VEGYFRESH_API_URL || "http://localhost:3000";
  const openapiPaths = portalRoutes();

  const issuer = env.KEYCLOAK_ISSUER;
  const sessionSecret = env.VEGYFRESH_SESSION_SECRET;
  if (!issuer) throw new Error("KEYCLOAK_ISSUER is required.");
  if (!sessionSecret) throw new Error("VEGYFRESH_SESSION_SECRET is required.");

  const bff = createBffProxy({
    apiBaseUrl,
    openapiPaths,
    fetchImpl,
    publicOrigin,
    issuer,
    internalIssuerUrl: env.KEYCLOAK_INTERNAL_URL,
    clientId: env.KEYCLOAK_CLIENT_ID || "vegyfresh-portal",
    clientSecret: env.KEYCLOAK_CLIENT_SECRET || undefined,
    sessionSecret,
    application: "portal",
    profilePath: "/api/v1/portal/auth/me",
    scopes: "openid profile email vegyfresh-api vegyfresh-portal",
  });
  return {
    publicOrigin,
    handle: bff.handle,
    getSession: async ({ cookieHeader, origin }) =>
      bff.getSession({ cookieHeader, origin }),
  };
}

let cachedKey: string | undefined;
let cachedProxy: PortalProxy | undefined;

export function getPortalProxy(env: ServerEnvironment = process.env) {
  const key = [
    env.AUTH_PROVIDER,
    env.VEGYFRESH_API_URL,
    env.VEGYFRESH_PUBLIC_ORIGIN,
    env.VEGYFRESH_SESSION_SECRET,
    env.KEYCLOAK_ISSUER,
    env.KEYCLOAK_INTERNAL_URL,
    env.KEYCLOAK_CLIENT_ID,
    env.KEYCLOAK_CLIENT_SECRET,
    env.PORT,
    env.NODE_ENV,
  ];
  const fingerprint = createHash("sha256").update(JSON.stringify(key)).digest("base64url");
  if (!cachedProxy || cachedKey !== fingerprint) {
    cachedProxy = createPortalProxy({ env });
    cachedKey = fingerprint;
  }
  return cachedProxy;
}

export function publicSessionProjection(
  session: SessionResult,
): PortalSessionSnapshot {
  const client = session.authenticated === true
    ? sessionProfile(session.profile)
    : undefined;
  const authenticated =
    session.authenticated === true && !client ? null : session.authenticated;
  return {
    provider: "keycloak",
    authenticated,
    ...(client ? { client } : {}),
  };
}

export function privateResponse(response: Response) {
  const headers = new Headers(response.headers);
  const cookies = response.headers.getSetCookie();
  headers.delete("set-cookie");
  headers.set("Cache-Control", "private, no-store");
  const vary = headers.get("Vary");
  const varyValues = (vary || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!varyValues.some((value) => value.toLowerCase() === "cookie")) {
    varyValues.push("Cookie");
  }
  headers.set("Vary", varyValues.join(", "));
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readBoundedRequest(request: Request, publicOrigin: string) {
  const incomingUrl = new URL(request.url);
  if (
    !["http:", "https:"].includes(incomingUrl.protocol) ||
    incomingUrl.username ||
    incomingUrl.password
  ) {
    return Response.json(
      { statusCode: 400, message: "Invalid request target" },
      { status: 400, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  }
  const canonicalUrl = new URL(
    `${incomingUrl.pathname}${incomingUrl.search}`,
    publicOrigin,
  );
  if (["GET", "HEAD"].includes(request.method) || !request.body) {
    return new Request(canonicalUrl, {
      method: request.method,
      headers: request.headers,
    });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_048_576) {
      await reader.cancel();
      return Response.json(
        { statusCode: 413, message: "Request body too large" },
        { status: 413, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
      );
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(canonicalUrl, {
    method: request.method,
    headers: request.headers,
    body,
  });
}

export async function handlePortalRequest(request: Request) {
  const proxy = getPortalProxy();
  const boundedRequest = await readBoundedRequest(request, proxy.publicOrigin);
  if (boundedRequest instanceof Response) {
    return privateResponse(boundedRequest);
  }
  return privateResponse(await proxy.handle(boundedRequest));
}

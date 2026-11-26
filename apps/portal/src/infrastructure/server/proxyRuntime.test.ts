// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPortalProxy,
  handlePortalRequest,
  privateResponse,
  publicSessionProjection,
} from "./proxyRuntime.server";

const portalOrigin = "https://portal.example.test";

afterEach(() => vi.unstubAllEnvs());

function keycloakProxy(fetchImpl: typeof fetch = vi.fn<typeof fetch>()) {
  return createPortalProxy({
    env: {
      VEGYFRESH_API_URL: "https://api.example.test",
      VEGYFRESH_PUBLIC_ORIGIN: portalOrigin,
      VEGYFRESH_SESSION_SECRET: "portal-session-secret-material-1234567890",
      OIDC_ISSUER: "https://identity.example.test/realms/vegyfresh",
      OIDC_CLIENT_ID: "vegyfresh-portal",
      OIDC_CLIENT_SECRET: "test-secret",
      OIDC_API_AUDIENCE: "vegyfresh-api",
      NODE_ENV: "production",
    },
    fetchImpl,
  });
}

describe("portal server proxy", () => {
  it("keeps API access scoped to portal identity", async () => {
    const forwarded: string[] = [];
    const proxy = keycloakProxy(async (input) => {
      forwarded.push(new URL(String(input)).pathname);
      return Response.json({ orders: [] });
    });

    const allowed = await proxy.handle(
      new Request(`${portalOrigin}/api/v1/portal/orders`),
    );
    const denied = await proxy.handle(
      new Request(`${portalOrigin}/api/v1/auth/me`),
    );
    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(404);
    expect(forwarded).toEqual(["/api/v1/portal/orders"]);
  });

  it("rejects cross-origin logout requests", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const proxy = keycloakProxy(fetchImpl);
    const response = await proxy.handle(
      new Request(`${portalOrigin}/session/logout`, {
        method: "POST",
        headers: { origin: "https://admin.example.test" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires confidential OIDC configuration", () => {
    expect(() => createPortalProxy({ env: { VEGYFRESH_PUBLIC_ORIGIN: portalOrigin, NODE_ENV: "production" } })).toThrow("OIDC_ISSUER");
  });

  it("does not accept an admin cookie as a portal session", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const proxy = keycloakProxy(fetchImpl);
    const response = await proxy.handle(
      new Request(`${portalOrigin}/session`, {
        headers: { cookie: "vegyfresh_admin_access_token=admin-token" },
      }),
    );
    expect(await response.json()).toEqual({
      provider: "oidc",
      authenticated: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("exposes only the portal client projection from the server session", () => {
    expect(
      publicSessionProjection({
        authenticated: true,
        cookies: [],
        profile: {
          access_token: "private-token",
          client: {
            id: "client-1",
            name: "Cliente Uno",
            email: null,
            portalEnabled: true,
            roles: ["admin"],
          },
        },
      }),
    ).toEqual({
      provider: "oidc",
      authenticated: true,
      client: {
        id: "client-1",
        name: "Cliente Uno",
        email: null,
        portalEnabled: true,
      },
    });
    expect(
      publicSessionProjection({
        authenticated: true,
        cookies: [],
        profile: { client: { id: "missing-fields" } },
      }).authenticated,
    ).toBeNull();
  });

  it("clears malformed portal cookies and preserves private session headers", async () => {
    const proxy = keycloakProxy();
    const response = privateResponse(
      await proxy.handle(
        new Request(`${portalOrigin}/session`, {
          headers: { cookie: "vegyfresh_portal_access_token=not-a-sealed-cookie" },
        }),
      ),
    );
    const cookies = response.headers.getSetCookie();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(cookies.some((cookie) => cookie.startsWith("vegyfresh_portal_access_token=;"))).toBe(true);
    expect(await response.json()).toEqual({
      provider: "oidc",
      authenticated: false,
    });
  });

  it("preserves multiple rotated cookies and bounds native request bodies", async () => {
    const response = privateResponse(
      new Response("ok", {
        headers: [
          ["Set-Cookie", "vegyfresh_portal_access_token=a; Path=/; HttpOnly"],
          ["Set-Cookie", "vegyfresh_portal_refresh_token=b; Path=/; HttpOnly"],
        ],
      }),
    );
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("vary")).toContain("Cookie");

    vi.stubEnv("OIDC_ISSUER", "http://localhost:8080/realms/vegyfresh");
    vi.stubEnv("OIDC_CLIENT_ID", "vegyfresh-portal");
    vi.stubEnv("OIDC_CLIENT_SECRET", "test-secret");
    vi.stubEnv("OIDC_API_AUDIENCE", "vegyfresh-api");
    vi.stubEnv("VEGYFRESH_SESSION_SECRET", "portal-session-secret-material-1234567890");
    vi.stubEnv("VEGYFRESH_PUBLIC_ORIGIN", "http://localhost:5174");
    vi.stubEnv("VEGYFRESH_API_URL", "http://localhost:3000");
    const tooLarge = await handlePortalRequest(
      new Request("http://localhost:5174/api/v1/portal/orders", {
        method: "POST",
        body: "x".repeat(1_048_577),
      }),
    );
    expect(tooLarge.status).toBe(413);

    const removedLocalLogin = await handlePortalRequest(
      new Request("http://localhost:5174/api/v1/portal/auth/login", {
        method: "POST",
        headers: {
          origin: "http://localhost:5174",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "client@example.test", password: "secret" }),
      }),
    );
    expect(removedLocalLogin.status).toBe(404);
  });
});

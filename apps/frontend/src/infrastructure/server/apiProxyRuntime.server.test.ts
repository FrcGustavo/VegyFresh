import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApiProxy,
  getPublicOrigin,
  handleProxyRequest,
} from "./apiProxyRuntime.server";

beforeEach(() => {
  vi.stubEnv("OIDC_ISSUER", "https://identity.example.test/realms/vegyfresh");
  vi.stubEnv("OIDC_CLIENT_ID", "vegyfresh-admin");
  vi.stubEnv("OIDC_CLIENT_SECRET", "test-secret");
  vi.stubEnv("OIDC_API_AUDIENCE", "vegyfresh-api");
  vi.stubEnv("OIDC_PROVISIONING_SECRET", "test-provisioning-secret-at-least-32-bytes");
  vi.stubEnv("VEGYFRESH_SESSION_SECRET", "a-session-secret-with-at-least-32-bytes");
  vi.stubEnv("VEGYFRESH_PUBLIC_ORIGIN", "https://admin.example.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin BFF runtime configuration", () => {
  it("requires confidential OIDC and provisioning configuration", () => {
    expect(() => createApiProxy()).not.toThrow();
    vi.stubEnv("OIDC_PROVISIONING_SECRET", "short");
    expect(() => createApiProxy()).toThrow("OIDC_PROVISIONING_SECRET");
  });

  it.each([
    "http://admin.example.test",
    "https://admin.example.test/path",
    "https://admin.example.test/",
    "https://user:pass@admin.example.test",
    "https://admin.example.test?query=1",
  ])("rejects an unsafe or noncanonical public origin: %s", (origin) => {
    vi.stubEnv("VEGYFRESH_PUBLIC_ORIGIN", origin);
    expect(() => getPublicOrigin()).toThrow();
  });

  it.each(["http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173"])(
    "allows a loopback development origin: %s",
    (origin) => {
      vi.stubEnv("VEGYFRESH_PUBLIC_ORIGIN", origin);
      expect(getPublicOrigin()).toBe(origin);
    },
  );

  it("returns a private anonymous session at the configured origin", async () => {
    const response = await handleProxyRequest(new Request("http://internal:3000/session"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(await response.json()).toEqual({ provider: "oidc", authenticated: false });
  });

  it("fails closed without exposing configuration errors", async () => {
    vi.stubEnv("VEGYFRESH_SESSION_SECRET", "");
    const response = await handleProxyRequest(new Request("http://internal:3000/session"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      statusCode: 503,
      message: "The API proxy is temporarily unavailable.",
    });
    const head = await handleProxyRequest(new Request("http://internal:3000/session", { method: "HEAD" }));
    expect(head.status).toBe(503);
    expect(await head.text()).toBe("");
  });
});

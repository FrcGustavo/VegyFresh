// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../presentation/app/providers";
import { usePortalSession } from "./hooks/usePortalSession";
import { readServerSession } from "./serverSession.server";
import type { PortalProxy } from "../server/proxyRuntime.server";

function Profile() {
  const { client, isLoading } = usePortalSession();
  return <span>{isLoading ? "loading" : client?.name ?? "guest"}</span>;
}

describe("server sessions", () => {
  it("projects concurrent requests separately and renders without browser globals or credentials", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof localStorage).toBe("undefined");
    const getSession = vi.fn(async ({ cookieHeader }: { cookieHeader?: string | null; origin: string }) => {
      await Promise.resolve();
      const name = cookieHeader === "session=a" ? "Alice" : "Bob";
      return {
        authenticated: true,
        profile: { client: { id: name, name, email: null, portalEnabled: true, token: "secret-profile" }, accessToken: "secret-token" },
        cookies: [`sealed-${name}; HttpOnly`],
      };
    });
    const proxy: PortalProxy = { publicOrigin: "https://portal.example", getSession, handle: vi.fn() };
    const [a, b] = await Promise.all(["a", "b"].map((id) => readServerSession(
      new Request("https://portal.example/portal", { headers: { cookie: `session=${id}` } }), proxy,
    )));
    const htmlA = renderToString(<AppProviders initialSession={a.session}><Profile /></AppProviders>);
    const htmlB = renderToString(<AppProviders initialSession={b.session}><Profile /></AppProviders>);
    expect(htmlA).toContain("Alice");
    expect(htmlA).not.toContain("Bob");
    expect(htmlB).toContain("Bob");
    expect(htmlB).not.toContain("Alice");
    expect(JSON.stringify(a.session)).not.toMatch(/secret|sealed|token/i);
    expect(a.cookies).toEqual(["sealed-Alice; HttpOnly"]);
    expect(getSession).toHaveBeenCalledWith({ cookieHeader: "session=a", origin: proxy.publicOrigin });
  });

  it("keeps unavailable sessions distinct from guests", async () => {
    const proxy: PortalProxy = {
      publicOrigin: "https://portal.example",
      getSession: async () => ({ authenticated: null, cookies: [] }),
      handle: vi.fn(),
    };
    const { session } = await readServerSession(new Request("https://portal.example"), proxy);
    expect(renderToString(<AppProviders initialSession={session}><Profile /></AppProviders>)).toContain("loading");
  });
});

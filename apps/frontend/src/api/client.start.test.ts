import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchApi } from "./client";

describe("Start browser transport", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("uses the same-origin BFF and never forwards a supplied bearer token", async () => {
    vi.stubEnv("VITE_START_RUNTIME", "true");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "one" }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    await expect(fetchApi("/products", { method: "POST", headers: { Authorization: "Bearer forged" }, body: "{}" })).resolves.toEqual({ id: "one" });
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("/api/v1/products");
    expect(options.credentials).toBe("same-origin");
    expect(options.headers.get("Authorization")).toBeNull();
    expect(options.headers.get("Content-Type")).toBe("application/json");
  });

  it("signals an expired session on a 401", async () => {
    vi.stubEnv("VITE_START_RUNTIME", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const logout = vi.fn();
    window.addEventListener("auth:logout", logout, { once: true });
    await expect(fetchApi("/products")).rejects.toThrow();
    expect(logout).toHaveBeenCalledOnce();
  });
});

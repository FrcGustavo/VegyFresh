import { afterEach, describe, expect, it, vi } from "vitest";
import { requestApi } from "./httpClient";

afterEach(() => vi.unstubAllGlobals());

describe("portal BFF transport", () => {
  it("uses same-origin cookies and strips caller-supplied bearer credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await requestApi("/portal/orders", {
      credentials: "include",
      headers: { Authorization: "Bearer secret", "X-Trace": "trace" },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/portal/orders");
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(new Headers(init.headers).get("X-Trace")).toBe("trace");
  });
});

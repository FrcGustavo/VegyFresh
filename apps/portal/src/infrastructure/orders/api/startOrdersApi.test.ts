import { afterEach, describe, expect, it, vi } from "vitest";
import { startOrdersApi } from "./startOrdersApi";

const order = {
  id: "order-1", client_id: "private-client", organization_id: "private-org", folio: "A1",
  status: "APPROVED", origin: "PORTAL", description: null, delivery_date: null,
  created_at: "2026-01-01", total_amount: "9007199254740993.50", items: [],
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("Start portal orders", () => {
  it("uses only the same-origin BFF, forwards cancellation and projects the response", async () => {
    localStorage.setItem("portal-access-token", "legacy-token");
    const fetchMock = vi.fn().mockResolvedValue(response([order]));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    const [result] = await startOrdersApi.list({ status: "APPROVED" }, signal);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/portal/orders?page=1&pageSize=50&status=APPROVED");
    expect(init.credentials).toBe("same-origin");
    expect(init.signal).toBe(signal);
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(result.total_amount).toBe("9007199254740993.50");
    expect(result).not.toHaveProperty("client_id");
    expect(result).not.toHaveProperty("organization_id");
  });

  it("encodes detail IDs and preserves authorization failures and non-JSON errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(order)).mockResolvedValueOnce(response({ message: "Forbidden" }, 403))
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    await startOrdersApi.get("order/1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/portal/orders/order%2F1");
    await expect(startOrdersApi.get("other-client")).rejects.toMatchObject({ message: "Forbidden", status: 403 });
    await expect(startOrdersApi.list({})).rejects.toMatchObject({ message: "Request failed", status: 502 });
  });

  it("passes an abort through to fetch", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const controller = new AbortController();
    const request = startOrdersApi.list({}, controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

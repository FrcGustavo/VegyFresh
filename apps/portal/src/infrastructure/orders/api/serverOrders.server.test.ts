// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readServerOrders } from "./serverOrders.server";
import type { PortalProxy } from "../../server/proxyRuntime.server";

const order = (name: string) => ({ id: name, folio: name, status: "pending", origin: "portal", description: null, delivery_date: null, created_at: "2026-01-01", total_amount: 1, items: [], privateToken: "not-public" });

describe("server order requests", () => {
  it("forwards only each request's cookies and projects responses without credentials", async () => {
    const handle = vi.fn(async (request: Request) => {
      await Promise.resolve();
      expect(request.headers.get("authorization")).toBeNull();
      const name = request.headers.get("cookie") === "session=a" ? "Alice" : "Bob";
      return Response.json([order(name)], { headers: { "Set-Cookie": `session=${name}; HttpOnly` } });
    });
    const proxy: PortalProxy = { publicOrigin: "https://portal.example", handle, getSession: vi.fn() };
    const results = await Promise.all(["a", "b"].map((name) => readServerOrders(new Request("https://portal.example/portal/orders", { headers: { cookie: `session=${name}`, authorization: "Bearer forged" } }), { kind: "list" }, proxy)));
    expect(results.map((result) => result.orders?.value)).toMatchObject([[{ folio: "Alice" }], [{ folio: "Bob" }]]);
    expect(JSON.stringify(results.map((result) => result.orders))).not.toMatch(/privateToken|not-public|session=/);
    expect(results.map((result) => result.cookies)).toEqual([["session=Alice; HttpOnly"], ["session=Bob; HttpOnly"]]);
    expect(handle.mock.calls[0][0].url).toBe("https://portal.example/api/v1/portal/orders?page=1&pageSize=50");
  });

  it("preserves cookie changes and hides upstream errors", async () => {
    const proxy: PortalProxy = { publicOrigin: "https://portal.example", getSession: vi.fn(), handle: async () => new Response("private upstream error", { status: 403, headers: { "Set-Cookie": "session=; Max-Age=0; HttpOnly" } }) };
    const result = await readServerOrders(new Request("https://portal.example"), { kind: "detail", id: "other" }, proxy);
    expect(result).toEqual({ orders: null, cookies: ["session=; Max-Age=0; HttpOnly"] });
  });
});

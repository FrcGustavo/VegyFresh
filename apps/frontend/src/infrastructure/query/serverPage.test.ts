import { describe, expect, it, vi } from "vitest";
import { hashKey } from "@tanstack/react-query";
import { clientsQueryOptions, ordersQueryOptions, productsQueryOptions, priceListsQueryOptions, suppliersQueryOptions } from "./resources";
import { LIST_PAGE_SIZE, LIST_INITIAL_FIELD, LIST_INITIAL_ORDER, ORDERS_INITIAL_FIELD, ORDERS_INITIAL_ORDER, ORDERS_INITIAL_FILTER } from "@/application/query/listDefaults";
import type { ApiProxy, PublicProfile } from "../server/apiProxy.mjs";
import { loadServerPage } from "./serverPage.server";

const origin = "http://localhost:5173";
function proxyFor(name: string, options: { role?: string; fail?: boolean } = {}): ApiProxy {
  const profile: PublicProfile = {
    user: { id: name, name, email: `${name}@example.test` },
    organization: { id: `org-${name}`, name: `Org ${name}` },
    role: { id: "role", name: "role", permissions: options.role ? [options.role] : [] },
  };
  return {
    getSession: async () => ({ authenticated: true, profile, cookies: [`session-${name}=rotated; HttpOnly`] }),
    handle: vi.fn(async (request) => {
      expect(request.headers.get("cookie")).toBe(`session=${name}`);
      return new Response(JSON.stringify({ data: [{ id: name, folio: `order-${name}` }], total: 1 }), {
        status: options.fail ? 503 : 200,
        headers: { "Set-Cookie": `refresh-${name}=rotated; HttpOnly` },
      });
    }),
  };
}

describe("request-local administrative preloads", () => {
  it("isolates concurrent session data and forwards rotated cookies only through headers", async () => {
    const run = async (name: string) => {
      const cookies: string[] = [];
      const result = await loadServerPage(new Request(origin, { headers: { cookie: `session=${name}` } }), "orders", (cookie) => cookies.push(cookie), proxyFor(name), origin);
      expect(cookies).toEqual([`session-${name}=rotated; HttpOnly`, `refresh-${name}=rotated; HttpOnly`]);
      expect(result?.state).toContain(`order-${name}`);
      expect(result?.state).not.toContain(`session=${name}`);
      return result;
    };
    const [alice, bob] = await Promise.all([run("Alice"), run("Bob")]);
    expect(alice?.state).not.toContain("Bob");
    expect(bob?.state).not.toContain("Alice");
    expect(alice?.identity).not.toEqual(bob?.identity);
  });
  it.each([
    ["clients", clientsQueryOptions], ["suppliers", suppliersQueryOptions],
    ["products", productsQueryOptions], ["price-lists", priceListsQueryOptions],
  ] as const)("hydrates the same initial %s query key used by the screen", async (page, queries) => {
    const result = await loadServerPage(new Request(origin, { headers: { cookie: "session=Alice" } }), page, () => {}, proxyFor("Alice"), origin);
    const state = JSON.parse(result!.state);
    const options = queries.infiniteList({ limit: String(LIST_PAGE_SIZE), order_by: LIST_INITIAL_FIELD, order: LIST_INITIAL_ORDER, search: undefined });
    expect(hashKey(state.queries[0].queryKey)).toEqual(hashKey(options.queryKey));
  });
  it("hydrates the initial orders key including the default created filter", async () => {
    const result = await loadServerPage(new Request(origin, { headers: { cookie: "session=Alice" } }), "orders", () => {}, proxyFor("Alice"), origin);
    const options = ordersQueryOptions.infiniteList({ limit: LIST_PAGE_SIZE, order_by: ORDERS_INITIAL_FIELD, order: ORDERS_INITIAL_ORDER, created_filter: ORDERS_INITIAL_FILTER, created_from: undefined, created_to: undefined });
    expect(hashKey(JSON.parse(result!.state).queries[0].queryKey)).toEqual(hashKey(options.queryKey));
  });
  it("does not request privileged users data without the permission", async () => {
    const proxy = proxyFor("Alice");
    expect(await loadServerPage(new Request(origin), "users", () => {}, proxy, origin)).toBeNull();
    expect(proxy.handle).not.toHaveBeenCalled();
  });
  it("retains rotated cookies when preload fails and leaves the browser to retry", async () => {
    const cookies: string[] = [];
    expect(await loadServerPage(new Request(origin, { headers: { cookie: "session=Alice" } }), "orders", (value) => cookies.push(value), proxyFor("Alice", { fail: true }), origin)).toBeNull();
    expect(cookies).toHaveLength(2);
  });
});

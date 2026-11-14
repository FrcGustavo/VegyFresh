import { createOrdersApi } from "./createOrdersApi";
import { getPortalProxy, type PortalProxy } from "../../server/proxyRuntime.server";
import type { PortalOrder } from "../../../domain/orders/order.types";

type OrderRequest = { kind: "list" } | { kind: "detail"; id: string };
type OrderResult = { kind: "list"; value: PortalOrder[] } | { kind: "detail"; value: PortalOrder };

// Forward only the request's cookies to the existing allowlisted BFF. Never serialize them.
export async function readServerOrders(request: Request, input: OrderRequest, proxy: PortalProxy = getPortalProxy()): Promise<{ orders: OrderResult | null; cookies: string[] }> {
  const cookies: string[] = [];
  const api = createOrdersApi(async <T>(path: string): Promise<T> => {
    const headers = new Headers({ accept: "application/json" });
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    const response = await proxy.handle(new Request(new URL(`/api/v1${path}`, proxy.publicOrigin), { headers }));
    cookies.push(...response.headers.getSetCookie());
    if (!response.ok) throw new Error("Order request failed");
    return await response.json() as T;
  });
  try {
    const orders: OrderResult = input.kind === "list"
      ? { kind: "list", value: await api.list({}) }
      : { kind: "detail", value: await api.get(input.id) };
    return { orders, cookies };
  } catch {
    return { orders: null, cookies };
  }
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { getOrder, listOrders } from "../../../application/orders/orders";
import { HttpError } from "../../api/httpClient";
import { ordersApi } from "./ordersApi";

const wireOrder = {
  id: "order-1", client_id: "client-private", user_id: "user-private",
  organization_id: "org-private", folio: "O0001", status: "APPROVED",
  origin: "PORTAL", description: null, delivery_date: null,
  created_at: "2026-10-28T00:00:00Z", total_amount: "9007199254740993.50",
  items: [{ id: "line-1", order_id: "order-1", product_id: "p1",
    quantity: "1.500", unit_price: 17, subtotal: "25.50",
    product: { id: "p1", folio: "P1", name: "Carrot", unit: "kg",
      organization_id: "org-private", stock: "12.00" } }],
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("portal orders adapter", () => {
  it("uses the same-origin BFF and preserves decimal values while projecting fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([wireOrder]));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    const [order] = await listOrders(ordersApi, { status: "APPROVED" }, signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/portal/orders?page=1&pageSize=50&status=APPROVED");
    expect(new Headers(init.headers).get("Authorization")).toBeNull();
    expect(init.credentials).toBe("same-origin");
    expect(init.signal).toBe(signal);
    expect(order.total_amount).toBe("9007199254740993.50");
    expect(order.items[0]).toEqual({ id: "line-1", product_id: "p1",
      quantity: "1.500", unit_price: 17, subtotal: "25.50",
      product: { id: "p1", folio: "P1", name: "Carrot", unit: "kg" } });
    expect(order).not.toHaveProperty("client_id");
    expect(order).not.toHaveProperty("organization_id");
  });

  it("encodes detail IDs, forwards cancellation and preserves API errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(wireOrder))
      .mockResolvedValueOnce(response({ message: "Forbidden" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await getOrder(ordersApi, "order/1", signal);
    expect(fetchMock.mock.calls[0][0]).toContain("/portal/orders/order%2F1");
    expect(fetchMock.mock.calls[0][1].signal).toBe(signal);
    await expect(getOrder(ordersApi, "other-client-order")).rejects.toMatchObject({
      message: "Forbidden", status: 403,
    } satisfies Partial<HttpError>);
    await expect(getOrder(ordersApi, "  ")).rejects.toThrow("El pedido es requerido");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

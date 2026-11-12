import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient, type ApiRequest, type PortalOrder } from "../index.js";

const order: PortalOrder = {
  id: "order-1",
  client_id: "client-1",
  user_id: "user-1",
  organization_id: "organization-1",
  total_amount: "12.50",
  folio: "ORD-1",
  description: null,
  status: "PENDING_REVIEW",
  origin: "PORTAL",
  delivery_date: null,
  created_at: "2026-01-01T00:00:00.000Z",
  items: [{
    id: "item-1",
    order_id: "order-1",
    product_id: "product-1",
    quantity: "2.5",
    unit_price: 5,
    subtotal: "12.50",
    product: {
      id: "product-1",
      folio: "PROD-1",
      name: "Tomato",
      description: null,
      supplier_id: "supplier-1",
      organization_id: "organization-1",
      stock: "10.5",
      unit: "kg",
      images: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  }],
};

test("portal orders serialize filters and preserve responses and request options", async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const request: ApiRequest = async <Response>(path: string, options?: RequestInit) => {
    calls.push({ path, options });
    return (path.includes("?") ? [order] : order) as Response;
  };
  const client = createApiClient({ request });
  const signal = new AbortController().signal;

  assert.deepEqual(await client.portalOrders.list({
    status: "PENDING_REVIEW",
    includeCanceled: "false",
    page: "2",
    pageSize: "25",
  }, { signal }), [order]);
  assert.deepEqual(await client.portalOrders.get("order/1 ?", { signal }), order);
  assert.deepEqual(calls, [
    { path: "/portal/orders?status=PENDING_REVIEW&includeCanceled=false&page=2&pageSize=25", options: { signal } },
    { path: "/portal/orders/order%2F1%20%3F", options: { signal } },
  ]);
});

test("portal orders reject empty responses", async () => {
  const client = createApiClient({ request: async () => null });
  await assert.rejects(client.portalOrders.list(), /sin contenido/);
  await assert.rejects(client.portalOrders.get("order-1"), /sin contenido/);
});

import { createApiClient, type PortalOrder as OrderResponse } from "@vegyfresh/api-client";
import type { OrdersPort } from "../../../application/orders/orders";
import type { PortalOrder } from "../../../domain/orders/order.types";
import type { ApiRequest } from "@vegyfresh/api-client";

export function toPortalOrder(order: OrderResponse): PortalOrder {
  return {
    id: order.id,
    folio: order.folio,
    status: order.status,
    origin: order.origin,
    description: order.description,
    delivery_date: order.delivery_date,
    created_at: order.created_at,
    total_amount: order.total_amount,
    items: order.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      ...(item.product ? { product: {
        id: item.product.id,
        folio: item.product.folio,
        name: item.product.name,
        unit: item.product.unit,
      } } : {}),
    })),
  };
}

export function createOrdersApi(request: ApiRequest): OrdersPort {
  const sdk = createApiClient({ request });
  return {
  list: async ({ status }, signal) => (await sdk.portalOrders.list(
    { page: "1", pageSize: "50", ...(status ? { status } : {}) },
    { signal },
  )).map(toPortalOrder),
  get: async (id, signal) => toPortalOrder(await sdk.portalOrders.get(id, { signal })),
  };
}

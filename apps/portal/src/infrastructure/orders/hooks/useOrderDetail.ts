import { useQuery } from "@tanstack/react-query";
import { getOrder } from "../../../application/orders/orders";
import type { PortalOrder } from "../../../domain/orders/order.types";
import type { OrdersPort } from "../../../application/orders/orders";

export function useOrderDetail(ordersApi: OrdersPort, orderId: string, initialData?: PortalOrder) {
  return useQuery({
    initialData,
    queryKey: ["portal-order-detail", orderId],
    queryFn: ({ signal }) => getOrder(ordersApi, orderId, signal),
    enabled: Boolean(orderId),
  });
}

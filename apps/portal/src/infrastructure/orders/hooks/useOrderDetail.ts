import { useQuery } from "@tanstack/react-query";
import { getOrder } from "../../../application/orders/orders";
import type { OrdersPort } from "../../../application/orders/orders";

export function useOrderDetail(ordersApi: OrdersPort, orderId: string) {
  return useQuery({
    queryKey: ["portal-order-detail", orderId],
    queryFn: ({ signal }) => getOrder(ordersApi, orderId, signal),
    enabled: Boolean(orderId),
  });
}

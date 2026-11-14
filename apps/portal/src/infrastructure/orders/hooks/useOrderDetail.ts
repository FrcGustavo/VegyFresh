import { useQuery } from "@tanstack/react-query";
import { getOrder } from "../../../application/orders/orders";
import { ordersApi } from "../api/ordersApi";

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ["portal-order-detail", orderId],
    queryFn: ({ signal }) => getOrder(ordersApi, orderId, signal),
    enabled: Boolean(orderId),
  });
}

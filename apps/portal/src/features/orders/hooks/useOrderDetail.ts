import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "../api/ordersApi";

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ["portal-order-detail", orderId],
    queryFn: () => ordersApi.detail(orderId),
    enabled: Boolean(orderId),
  });
}

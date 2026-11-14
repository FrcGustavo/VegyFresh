import { useQuery } from "@tanstack/react-query";
import { listOrders } from "../../../application/orders/orders";
import { ordersApi } from "../api/ordersApi";

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ["portal-orders", status ?? "all"],
    queryFn: ({ signal }) => listOrders(ordersApi, { status }, signal),
  });
}

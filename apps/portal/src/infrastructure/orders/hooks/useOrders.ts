import { useQuery } from "@tanstack/react-query";
import { listOrders } from "../../../application/orders/orders";
import type { OrdersPort } from "../../../application/orders/orders";

export function useOrders(ordersApi: OrdersPort, status?: string) {
  return useQuery({
    queryKey: ["portal-orders", status ?? "all"],
    queryFn: ({ signal }) => listOrders(ordersApi, { status }, signal),
  });
}

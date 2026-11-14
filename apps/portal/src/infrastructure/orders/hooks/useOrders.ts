import { useQuery } from "@tanstack/react-query";
import { listOrders } from "../../../application/orders/orders";
import type { PortalOrder } from "../../../domain/orders/order.types";
import type { OrdersPort } from "../../../application/orders/orders";

export function useOrders(ordersApi: OrdersPort, status?: string, initialData?: PortalOrder[]) {
  return useQuery({
    initialData,
    queryKey: ["portal-orders", status ?? "all"],
    queryFn: ({ signal }) => listOrders(ordersApi, { status }, signal),
  });
}

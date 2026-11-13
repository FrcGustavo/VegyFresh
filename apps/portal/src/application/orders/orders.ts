import type { PortalOrder } from "../../domain/orders/order.types";

export type OrderListFilter = { status?: string };

export interface OrdersPort {
  list(filter: OrderListFilter, signal?: AbortSignal): Promise<PortalOrder[]>;
  get(id: string, signal?: AbortSignal): Promise<PortalOrder>;
}

export function listOrders(port: OrdersPort, filter: OrderListFilter, signal?: AbortSignal) {
  return port.list(filter, signal);
}

export function getOrder(port: OrdersPort, id: string, signal?: AbortSignal) {
  if (!id.trim()) return Promise.reject(new Error("El pedido es requerido"));
  return port.get(id, signal);
}

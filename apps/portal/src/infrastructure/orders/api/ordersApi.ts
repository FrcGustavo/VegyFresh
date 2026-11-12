import { requestApi } from "../../api/httpClient";
import type { PortalOrder } from "../../../domain/orders/order.types";

export const ordersApi = {
  list: (params: URLSearchParams) =>
    requestApi<PortalOrder[]>(`/portal/orders?${params.toString()}`),
  detail: (id: string) => requestApi<PortalOrder>(`/portal/orders/${id}`),
};

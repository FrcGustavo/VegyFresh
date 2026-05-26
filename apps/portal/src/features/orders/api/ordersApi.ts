import { requestApi } from '../../../shared/api/httpClient';
import type { PortalOrder } from '../types/order.types';

export const ordersApi = {
  list: (params: URLSearchParams) =>
    requestApi<PortalOrder[]>(`/portal/orders?${params.toString()}`),
  detail: (id: string) => requestApi<PortalOrder>(`/portal/orders/${id}`),
};

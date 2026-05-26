import { requestApi } from '../../../shared/api/httpClient';
import type { PortalOrder } from '../types/order.types';

export type CreatePortalOrderPayload = {
  requestedDeliveryDate?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
};

export const ordersApi = {
  list: (params: URLSearchParams) =>
    requestApi<PortalOrder[]>(`/portal/orders?${params.toString()}`),
  detail: (id: string) => requestApi<PortalOrder>(`/portal/orders/${id}`),
  create: (payload: CreatePortalOrderPayload) =>
    requestApi<PortalOrder>('/portal/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancel: (id: string, reason?: string) =>
    requestApi<PortalOrder>(`/portal/orders/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};

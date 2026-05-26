import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['portal-orders', status ?? 'all'],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '50');
      if (status) params.set('status', status);
      return ordersApi.list(params);
    },
  });
}

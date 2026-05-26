import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, type CreatePortalOrderPayload } from '../api/ordersApi';

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePortalOrderPayload) => ordersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-orders'] });
    },
  });
}

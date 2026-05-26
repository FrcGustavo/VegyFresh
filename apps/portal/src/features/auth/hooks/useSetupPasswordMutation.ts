import { useMutation } from '@tanstack/react-query';
import { type SetupPasswordPayload } from '../api/authApi';
import { usePortalSession } from './usePortalSession';

export function useSetupPasswordMutation() {
  const session = usePortalSession();
  return useMutation({
    mutationFn: (payload: SetupPasswordPayload) => session.setupPassword(payload),
  });
}

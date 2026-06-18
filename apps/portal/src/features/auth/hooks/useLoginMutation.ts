import { useMutation } from "@tanstack/react-query";
import { type LoginPayload } from "../api/authApi";
import { usePortalSession } from "./usePortalSession";

export function useLoginMutation() {
  const session = usePortalSession();
  return useMutation({
    mutationFn: (payload: LoginPayload) => session.login(payload),
  });
}

import { useQuery } from "@tanstack/react-query";
import type { PortalSessionSnapshot } from "../../domain/auth/auth.types";
import { getPublicSession } from "./session.functions";

export function usePublicSession(initialSession: PortalSessionSnapshot) {
  return useQuery({
    queryKey: ["portal-session"], queryFn: () => getPublicSession(),
    initialData: initialSession, staleTime: Infinity,
  });
}

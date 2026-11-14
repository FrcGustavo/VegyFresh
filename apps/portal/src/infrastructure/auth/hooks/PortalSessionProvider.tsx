import { useMemo, type ReactNode } from "react";
import type { PortalSessionSnapshot } from "../../../domain/auth/auth.types";
import { logoutSession } from "../sessionActions";
import { PortalSessionContext, type PortalSessionContextValue } from "./usePortalSession";

export function PortalSessionProvider({ children, initialSession }: { children: ReactNode; initialSession?: PortalSessionSnapshot }) {
  const client = initialSession?.authenticated === true ? initialSession.client ?? null : null;
  const value = useMemo<PortalSessionContextValue>(() => ({
    client,
    isAuthenticated: initialSession?.authenticated === true && Boolean(client),
    isLoading: initialSession?.authenticated === null,
    isUnavailable: initialSession?.authenticated === null,
    logout: logoutSession,
  }), [client, initialSession?.authenticated]);
  return <PortalSessionContext.Provider value={value}>{children}</PortalSessionContext.Provider>;
}

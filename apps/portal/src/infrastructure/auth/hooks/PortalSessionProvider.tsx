import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { PortalClientProfile, PortalSessionSnapshot } from "../../../domain/auth/auth.types";
import type { PortalSessionAdapter } from "../browserSession";
import { PortalSessionContext, type PortalSessionContextValue } from "./portalSessionContext";

export function PortalSessionProvider({
  children,
  initialSession,
  adapter,
  onIdentityChange,
}: {
  children: ReactNode;
  initialSession?: PortalSessionSnapshot;
  adapter: PortalSessionAdapter;
  onIdentityChange?: () => void;
}) {
  const [client, setClient] = useState<PortalClientProfile | null>(
    () => initialSession?.authenticated === true ? initialSession.client ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(
    () => initialSession === undefined || initialSession.authenticated === null,
  );
  // The snapshot belongs to this provider's request and must not be replaced on rerender.
  const [needsLoad] = useState(() => initialSession === undefined);

  useEffect(() => {
    if (!needsLoad) return;
    let active = true;
    void adapter.load().then(
      (profile) => { if (active) setClient(profile); },
      () => { if (active) setClient(null); },
    ).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [adapter, needsLoad]);

  const value = useMemo<PortalSessionContextValue>(
    () => ({
      client,
      isAuthenticated: Boolean(client),
      isLoading,
      login: async (payload) => {
        const profile = await adapter.login(payload);
        onIdentityChange?.();
        setClient(profile);
      },
      setupPassword: async (payload) => {
        const profile = await adapter.setupPassword(payload);
        onIdentityChange?.();
        setClient(profile);
      },
      logout: async () => {
        await adapter.logout();
        onIdentityChange?.();
        setClient(null);
      },
    }),
    [adapter, client, isLoading, onIdentityChange],
  );

  return <PortalSessionContext.Provider value={value}>{children}</PortalSessionContext.Provider>;
}

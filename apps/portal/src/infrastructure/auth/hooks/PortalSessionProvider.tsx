import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../authApi";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../../api/httpClient";
import type { PortalClientProfile } from "../../../domain/auth/auth.types";

import { PortalSessionContext, type PortalSessionContextValue } from "./portalSessionContext";

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PortalClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        if (accessToken) {
          const profile = await authApi.me();
          setClient(profile);
          setIsLoading(false);
          return;
        }

        const refreshed = await authApi.refresh();
        setTokens(refreshed.access_token, refreshed.refresh_token);
        setClient(refreshed.client);
      } catch {
        clearTokens();
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    void hydrate();
  }, []);

  const value = useMemo<PortalSessionContextValue>(
    () => ({
      client,
      isAuthenticated: Boolean(client),
      isLoading,
      login: async (payload) => {
        const response = await authApi.login(payload);
        setTokens(response.access_token, response.refresh_token);
        setClient(response.client);
      },
      setupPassword: async (payload) => {
        const response = await authApi.setupPassword(payload);
        setTokens(response.access_token, response.refresh_token);
        setClient(response.client);
      },
      logout: async () => {
        await authApi.logout();
        setClient(null);
      },
    }),
    [client, isLoading],
  );

  return (
    <PortalSessionContext.Provider value={value}>
      {children}
    </PortalSessionContext.Provider>
  );
}

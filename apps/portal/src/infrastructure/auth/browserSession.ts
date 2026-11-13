import { authApi, type LoginPayload, type SetupPasswordPayload } from "./authApi";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../api/httpClient";
import type { PortalClientProfile } from "../../domain/auth/auth.types";

export type PortalSessionAdapter = {
  load: () => Promise<PortalClientProfile | null>;
  login: (payload: LoginPayload) => Promise<PortalClientProfile>;
  setupPassword: (payload: SetupPasswordPayload) => Promise<PortalClientProfile>;
  logout: () => Promise<void>;
};

// This adapter is used only by the current browser SPA. Server renders receive
// a public snapshot and do not call it.
export const browserSession: PortalSessionAdapter = {
  async load() {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!accessToken && !refreshToken) return null;

    try {
      if (accessToken) return await authApi.me();
      const refreshed = await authApi.refresh();
      setTokens(refreshed.access_token, refreshed.refresh_token);
      return refreshed.client;
    } catch {
      clearTokens();
      return null;
    }
  },
  async login(payload) {
    const response = await authApi.login(payload);
    setTokens(response.access_token, response.refresh_token);
    return response.client;
  },
  async setupPassword(payload) {
    const response = await authApi.setupPassword(payload);
    setTokens(response.access_token, response.refresh_token);
    return response.client;
  },
  logout: () => authApi.logout(),
};

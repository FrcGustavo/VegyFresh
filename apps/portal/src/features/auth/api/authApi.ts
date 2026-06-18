import { API_URL } from "../../../config/env";
import {
  clearTokens,
  getRefreshToken,
  requestApi,
} from "../../../shared/api/httpClient";
import type {
  PortalAuthResponse,
  PortalClientProfile,
} from "../types/auth.types";

export type LoginPayload = {
  email: string;
  password: string;
};

export type SetupPasswordPayload = {
  token: string;
  password: string;
};

type MeResponse = {
  client: PortalClientProfile;
};

export const authApi = {
  login(payload: LoginPayload) {
    return requestApi<PortalAuthResponse>("/portal/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  setupPassword(payload: SetupPasswordPayload) {
    return requestApi<PortalAuthResponse>("/portal/auth/setup-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async refresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    return requestApi<PortalAuthResponse>("/portal/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },
  async me() {
    const response = await requestApi<MeResponse>("/portal/auth/me");
    return response.client;
  },
  async logout() {
    try {
      await fetch(`${API_URL}/portal/auth/logout`, {
        method: "POST",
        headers: (() => {
          const accessToken = localStorage.getItem("portal-access-token");
          return accessToken
            ? ({ Authorization: `Bearer ${accessToken}` } as HeadersInit)
            : undefined;
        })(),
      });
    } finally {
      clearTokens();
    }
  },
};

import { createContext } from "react";
import type { LoginPayload, SetupPasswordPayload } from "../authApi";
import type { PortalClientProfile } from "../../../domain/auth/auth.types";

export type PortalSessionContextValue = {
  client: PortalClientProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  setupPassword: (payload: SetupPasswordPayload) => Promise<void>;
  logout: () => Promise<void>;
};

export const PortalSessionContext = createContext<PortalSessionContextValue | null>(
  null,
);

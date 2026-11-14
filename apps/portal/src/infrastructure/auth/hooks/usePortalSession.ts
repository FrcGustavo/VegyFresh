import { createContext, useContext } from "react";
import type { PortalClientProfile } from "../../../domain/auth/auth.types";

export type PortalSessionContextValue = {
  client: PortalClientProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isUnavailable: boolean;
  logout: () => Promise<void>;
};

export const PortalSessionContext = createContext<PortalSessionContextValue | null>(
  null,
);

export function usePortalSession() {
  const context = useContext(PortalSessionContext);
  if (!context) {
    throw new Error(
      "usePortalSession must be used inside PortalSessionProvider",
    );
  }
  return context;
}

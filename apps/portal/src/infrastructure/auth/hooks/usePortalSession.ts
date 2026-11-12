import { useContext } from "react";
import { PortalSessionContext } from "./portalSessionContext";

export function usePortalSession() {
  const context = useContext(PortalSessionContext);
  if (!context) {
    throw new Error(
      "usePortalSession must be used inside PortalSessionProvider",
    );
  }
  return context;
}

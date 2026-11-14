import { useLocation as useStartLocation, useNavigate as useStartNavigate } from "@tanstack/react-router";
import { useLocation as useSpaLocation, useNavigate as useSpaNavigate } from "react-router";

// Vite fixes this flag for each build, so the chosen hook never changes during a mount.
export function useAppNavigate(): (path: string) => void {
  if (import.meta.env.VITE_START_RUNTIME === "true") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const navigate = useStartNavigate();
    return (path) => { void navigate({ to: path }); };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSpaNavigate();
}

export function useAppLocation(): { pathname: string } {
  if (import.meta.env.VITE_START_RUNTIME === "true") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useStartLocation();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSpaLocation();
}

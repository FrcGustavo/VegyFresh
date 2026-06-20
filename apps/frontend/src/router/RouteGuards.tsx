import { Box, CircularProgress } from "@mui/material";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/useAuth";
import { canAccessOrganizationResource } from "../auth/authorization";
import type { AuthRole } from "../auth/authApi";

/** Redirects unauthenticated users to /login. Shows a spinner while auth initialises. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, organization } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!organization && location.pathname !== "/organization") {
    return <Navigate to="/organization" replace />;
  }

  return <>{children}</>;
}

export function OrganizationRoute({ children }: { children: ReactNode }) {
  const { organization, role } = useAuth();

  if (!organization || canAccessOrganizationResource(role)) {
    return <>{children}</>;
  }

  return <Navigate to="/orders" replace />;
}

export function RoleProtectedRoute({
  children,
  canAccess,
}: {
  children: ReactNode;
  canAccess: (role: AuthRole | null | undefined) => boolean;
}) {
  const { role } = useAuth();

  return canAccess(role) ? <>{children}</> : <Navigate to="/orders" replace />;
}

export function HomeRedirect() {
  const { organization } = useAuth();
  return <Navigate to={organization ? "/orders" : "/organization"} replace />;
}

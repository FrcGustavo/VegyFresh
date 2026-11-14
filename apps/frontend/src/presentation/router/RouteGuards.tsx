import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "../../auth/useAuth";
import { canAccessOrganizationResource } from "../../domain/auth/authorization";
import type { AuthRole } from "../../domain/auth/AuthRole";

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

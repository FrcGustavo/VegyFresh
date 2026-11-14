/* eslint-disable react-refresh/only-export-components -- File routes export their configuration. */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { readServerSession } from "@/infrastructure/auth/serverSession";
import { canAccessOrganizationResource, canAccessUsersResource } from "@/domain/auth/authorization";
import MainLayout from "../layout/MainLayout";
import { StartApp } from "../start/StartApp";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await readServerSession();
    if (session.authenticated === false) {
      throw redirect({ href: `/login?returnTo=${encodeURIComponent(location.href)}`, reloadDocument: true, statusCode: 303 });
    }
    if (session.authenticated === true) {
      const role = session.role?.id && session.role.name
        ? { id: session.role.id, name: session.role.name, permissions: session.role.permissions ?? [] }
        : null;
      let target: string | undefined;
      if (location.pathname === "/") target = session.organization?.id ? "/orders" : "/organization";
      else if (!session.organization?.id && location.pathname !== "/organization") target = "/organization";
      else if (location.pathname === "/users" && !canAccessUsersResource(role)) target = "/orders";
      else if (location.pathname === "/organization" && session.organization?.id && !canAccessOrganizationResource(role)) target = "/orders";
      if (target) throw redirect({ href: target, reloadDocument: true, statusCode: 303 });
    }
    return { session };
  },
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  component: AdminRoute,
});

function AdminRoute() {
  const { session } = Route.useRouteContext();
  if (session.authenticated === null || !session.user?.id || !session.user.name || !session.user.email) {
    return <main role="alert"><p>No se pudo verificar tu sesión. Inténtalo de nuevo.</p><button type="button" onClick={() => window.location.reload()}>Reintentar</button></main>;
  }
  const identity = JSON.stringify([session.user.id, session.organization?.id, session.role?.id]);
  return <StartApp key={identity} session={session}><MainLayout><Outlet /></MainLayout></StartApp>;
}

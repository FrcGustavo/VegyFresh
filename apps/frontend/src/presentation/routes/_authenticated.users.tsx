import { HydrationBoundary } from "@tanstack/react-query";
import { readServerPage } from "@/infrastructure/query/serverPage";
/* eslint-disable react-refresh/only-export-components -- File routes export their configuration. */
import { createFileRoute } from "@tanstack/react-router";
import UsersList from "../users/pages/UsersList";
import { RoleProtectedRoute } from "../router/RouteGuards";
import { canAccessUsersResource } from "@/domain/auth/authorization";
export const Route = createFileRoute("/_authenticated/users")({
  loader: ({ context }) => context.session.authenticated === true && context.session.user?.id && context.session.user.name && context.session.user.email ? readServerPage({ data: "users" }) : null,
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const identity = JSON.stringify([session.user?.id, session.organization?.id, session.role?.id]);
  return <HydrationBoundary state={data?.identity === identity ? JSON.parse(data.state) : undefined}><RoleProtectedRoute canAccess={canAccessUsersResource}><UsersList /></RoleProtectedRoute></HydrationBoundary>;
}

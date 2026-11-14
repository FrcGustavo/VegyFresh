import { HydrationBoundary } from "@tanstack/react-query";
import { readServerPage } from "@/infrastructure/query/serverPage";
/* eslint-disable react-refresh/only-export-components -- File routes export their configuration. */
import { createFileRoute } from "@tanstack/react-router";
import OrdersList from "../orders/pages/OrdersList";
export const Route = createFileRoute("/_authenticated/orders")({
  loader: ({ context }) => context.session.authenticated === true && context.session.user?.id && context.session.user.name && context.session.user.email ? readServerPage({ data: "orders" }) : null,
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const identity = JSON.stringify([session.user?.id, session.organization?.id, session.role?.id]);
  return <HydrationBoundary state={data?.identity === identity ? JSON.parse(data.state) : undefined}><OrdersList /></HydrationBoundary>;
}

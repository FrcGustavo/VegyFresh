/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their route configuration. */
import { Chip } from "@mui/material";
import { createFileRoute, Link } from "@tanstack/react-router";
import { startOrdersApi } from "../infrastructure/orders/api/startOrdersApi";
import { getServerOrders } from "../orders.functions";
import { OrdersView } from "../presentation/features/orders/pages/OrdersView";

export const Route = createFileRoute("/portal/orders/")({
  loader: ({ context }) => context.session.authenticated === true ? getServerOrders({ data: { kind: "list" } }) : null,
  component: OrdersRoute,
});

function OrdersRoute() {
  const result = Route.useLoaderData();
  return <OrdersView initialOrders={result?.kind === "list" ? result.value : undefined} ordersApi={startOrdersApi} orderLink={(id) => <Link to="/portal/orders/$orderId" params={{ orderId: id }}><Chip clickable size="small" label="View" /></Link>} />;
}

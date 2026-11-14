/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their route configuration. */
import { createFileRoute } from "@tanstack/react-router";
import { startOrdersApi } from "../infrastructure/orders/api/startOrdersApi";
import { getServerOrders } from "../orders.functions";
import { OrderDetailView } from "../presentation/features/orders/pages/OrderDetailView";

export const Route = createFileRoute("/portal/orders/$orderId")({
  loader: ({ context, params }) => context.session.authenticated === true ? getServerOrders({ data: { kind: "detail", id: params.orderId } }) : null,
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  const result = Route.useLoaderData();
  return <OrderDetailView initialOrder={result?.kind === "detail" ? result.value : undefined} ordersApi={startOrdersApi} orderId={Route.useParams().orderId} />;
}

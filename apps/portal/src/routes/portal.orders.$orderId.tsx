/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their route configuration. */
import { createFileRoute } from "@tanstack/react-router";
import { startOrdersApi } from "../infrastructure/orders/api/startOrdersApi";
import { OrderDetailView } from "../presentation/features/orders/pages/OrderDetailView";

export const Route = createFileRoute("/portal/orders/$orderId")({ component: OrderDetailRoute });

function OrderDetailRoute() {
  return <OrderDetailView ordersApi={startOrdersApi} orderId={Route.useParams().orderId} />;
}

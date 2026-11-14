import { createFileRoute } from "@tanstack/react-router";
import OrdersList from "../orders/pages/OrdersList";
export const Route = createFileRoute("/_authenticated/orders")({ component: () => <OrdersList /> });

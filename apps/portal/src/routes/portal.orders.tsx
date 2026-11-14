import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/orders")({ component: Outlet });

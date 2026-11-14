import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../presentation/features/dashboard/pages/DashboardPage";

export const Route = createFileRoute("/portal/dashboard")({ component: DashboardPage });

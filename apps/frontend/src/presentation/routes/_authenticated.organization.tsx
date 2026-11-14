import { createFileRoute } from "@tanstack/react-router";
import OrganizationPage from "../organization/pages/OrganizationPage";
import { OrganizationRoute } from "../router/RouteGuards";
export const Route = createFileRoute("/_authenticated/organization")({ component: () => <OrganizationRoute><OrganizationPage /></OrganizationRoute> });

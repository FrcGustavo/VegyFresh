import { createFileRoute } from "@tanstack/react-router";
import ClientsList from "../clients/pages/ClientsList";
export const Route = createFileRoute("/_authenticated/clients")({ component: () => <ClientsList /> });

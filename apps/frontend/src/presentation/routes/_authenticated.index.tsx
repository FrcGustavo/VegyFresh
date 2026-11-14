import { createFileRoute } from "@tanstack/react-router";
import { HomeRedirect } from "../router/RouteGuards";
export const Route = createFileRoute("/_authenticated/")({ component: HomeRedirect });

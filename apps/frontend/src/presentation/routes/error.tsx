import { createFileRoute } from "@tanstack/react-router";
import { AuthErrorPage } from "../auth/pages/AuthErrorPage";
export const Route = createFileRoute("/error")({ component: AuthErrorPage });

/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their configuration. */
import { createFileRoute } from "@tanstack/react-router";
import { AuthErrorPage } from "../presentation/features/auth/pages/AuthErrorPage";

export const Route = createFileRoute("/error")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: ErrorRoute,
});

function ErrorRoute() {
  const { error } = Route.useSearch();
  return <AuthErrorPage error={error} />;
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { buildAuthStartHref } from "@/infrastructure/auth/authRedirect";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: buildAuthStartHref("login", location.searchStr),
      reloadDocument: true,
      statusCode: 303,
    });
  },
});

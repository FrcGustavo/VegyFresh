import { createFileRoute, redirect } from "@tanstack/react-router";
import { buildAuthStartHref } from "@/infrastructure/auth/authRedirect";

export const Route = createFileRoute("/signup")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: buildAuthStartHref("register", location.searchStr),
      reloadDocument: true,
      statusCode: 303,
    });
  },
});

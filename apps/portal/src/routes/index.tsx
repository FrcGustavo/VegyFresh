/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their route configuration. */
import { createFileRoute } from "@tanstack/react-router";
import { StartSignIn } from "../presentation/app/StartSignIn";
import { getPublicSession } from "../infrastructure/auth/session.functions";

export const Route = createFileRoute("/")({
  loader: () => getPublicSession(),
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  component: SignInRoute,
});

function SignInRoute() {
  return <StartSignIn initialSession={Route.useLoaderData()} />;
}

/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their route configuration. */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { StartPortal } from "../presentation/app/StartPortal";
import { getPublicSession } from "../session.functions";

export const Route = createFileRoute("/portal")({
  beforeLoad: async ({ context }) => {
    // A revalidated session may belong to a different identity.
    context.queryClient.clear();
    const session = await getPublicSession();
    if (session.authenticated === false) throw redirect({ to: "/" });
    return { session };
  },
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  component: PortalRoute,
});

function PortalRoute() {
  return <StartPortal session={Route.useRouteContext().session} />;
}

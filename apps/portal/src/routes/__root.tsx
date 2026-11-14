/* eslint-disable react-refresh/only-export-components -- TanStack route modules export their route configuration. */
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "VegyFresh Portal" }] }),
  component: Root,
});

function Root() {
  const { queryClient } = Route.useRouteContext();
  return <html lang="en"><head><HeadContent /></head><body><QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider><Scripts /></body></html>;
}

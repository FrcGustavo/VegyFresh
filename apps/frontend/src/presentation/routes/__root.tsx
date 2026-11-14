/* eslint-disable react-refresh/only-export-components -- File routes export their configuration. */
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "VegyFresh" }] }),
  component: Root,
});
function Root() {
  return <html lang="es"><head><HeadContent /></head><body><Outlet /><Scripts /></body></html>;
}

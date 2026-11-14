import { createRouter } from "@tanstack/react-router";
import { createQueryClient } from "./presentation/app/queryClient";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({ routeTree, context: { queryClient: createQueryClient() } });
}

declare module "@tanstack/react-router" {
  interface Register { router: ReturnType<typeof getRouter> }
}

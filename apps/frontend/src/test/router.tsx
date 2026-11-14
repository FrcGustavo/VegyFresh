import {
  createMemoryHistory,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { routeTree } from "../presentation/routeTree.gen";

export function createTestRouterWrapper(initialEntries = ["/"]) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
  });

  function TestRouter({ children }: PropsWithChildren) {
    return (
      <RouterContextProvider router={router}>{children}</RouterContextProvider>
    );
  }

  return { router, wrapper: TestRouter };
}

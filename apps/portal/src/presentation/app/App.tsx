import { RouterProvider } from "react-router";
import { AppProviders } from "./providers";
import { router } from "./router";

export function AppRoot() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

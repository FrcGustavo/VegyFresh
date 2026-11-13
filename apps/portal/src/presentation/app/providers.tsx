import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import { createVegyTheme } from "@vegyfresh/ui";
import { useState, type ReactNode } from "react";
import { PortalSessionProvider } from "../../infrastructure/auth/hooks/PortalSessionProvider";
import { createQueryClient } from "./queryClient";

const theme = createVegyTheme();

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <PortalSessionProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </PortalSessionProvider>
    </QueryClientProvider>
  );
}

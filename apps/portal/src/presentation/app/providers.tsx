import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import { createVegyTheme } from "@vegyfresh/ui";
import { useState, type ReactNode } from "react";
import { PortalSessionProvider } from "../../infrastructure/auth/hooks/PortalSessionProvider";
import type { PortalSessionSnapshot } from "../../domain/auth/auth.types";
import { browserSession, type PortalSessionAdapter } from "../../infrastructure/auth/browserSession";
import { createQueryClient } from "./queryClient";

const theme = createVegyTheme();

export function AppProviders({ children, initialSession, sessionAdapter }: {
  children: ReactNode;
  initialSession?: PortalSessionSnapshot;
  sessionAdapter?: PortalSessionAdapter;
}) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <PortalSessionProvider
        initialSession={initialSession}
        adapter={sessionAdapter ?? browserSession}
        onIdentityChange={() => queryClient.clear()}
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </PortalSessionProvider>
    </QueryClientProvider>
  );
}

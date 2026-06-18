import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PortalSessionProvider } from "../features/auth/hooks/usePortalSession";
import { queryClient } from "./queryClient";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2e7d32",
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
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

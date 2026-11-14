import { useState, type ReactNode } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemePreferenceProvider } from "@/infrastructure/preferences/ThemePreferenceProvider";
import type { PublicSession } from "@/infrastructure/auth/serverSession";
import { useAppTheme } from "@/presentation/theme/useAppTheme";
import { StartAuthProvider } from "./StartAuthProvider";
import "@fontsource/roboto/latin-300.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "@/index.css";

function Content({ session, children }: { session: PublicSession; children: ReactNode }) {
  const { theme } = useAppTheme();
  return <ThemeProvider theme={theme}><CssBaseline enableColorScheme /><StartAuthProvider session={session}>{children}</StartAuthProvider></ThemeProvider>;
}

export function StartApp({ session, children }: { session: PublicSession; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}><ThemePreferenceProvider><Content session={session}>{children}</Content></ThemePreferenceProvider></QueryClientProvider>;
}

import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "./auth/AuthContext";
import { ThemePreferenceProvider } from "./infrastructure/preferences/ThemePreferenceProvider";
import { AppRouter } from "./router/AppRouter";
import { useAppTheme } from "./presentation/theme/useAppTheme";

function ThemedApp() {
  const { theme } = useAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemePreferenceProvider>
      <ThemedApp />
    </ThemePreferenceProvider>
  );
}

export default App;

import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "./auth/AuthContext";
import { AppRouter } from "./router/AppRouter";
import { useAppTheme } from "./theme/useAppTheme";

function App() {
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

export default App;

import { useMediaQuery } from "@mui/material";
import { createTheme, type PaletteMode } from "@mui/material/styles";
import { useMemo } from "react";
import { useThemePreferenceStore } from "@/infrastructure/preferences/useThemePreferenceStore";

const palettes = {
  light: {
    primary: {
      light: "#66bb6a",
      main: "#2e7d32",
      dark: "#1b5e20",
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#ffb74d",
      main: "#ed6c02",
      dark: "#c45100",
      contrastText: "#ffffff",
    },
    success: { main: "#2e7d32" },
    warning: { main: "#e65100" },
    error: { main: "#c62828" },
    info: { main: "#0277bd" },
    background: {
      default: "#f5f8f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#1f2a22",
      secondary: "#5f6f63",
    },
    divider: "rgba(42, 74, 47, 0.14)",
    action: {
      hover: "rgba(46, 125, 50, 0.06)",
      selected: "rgba(46, 125, 50, 0.12)",
    },
  },
  dark: {
    primary: {
      light: "#a5d6a7",
      main: "#81c784",
      dark: "#4caf50",
      contrastText: "#102015",
    },
    secondary: {
      light: "#ffcc80",
      main: "#ffb74d",
      dark: "#ed6c02",
      contrastText: "#2b1a0a",
    },
    success: { main: "#81c784" },
    warning: { main: "#ffb74d" },
    error: { main: "#ef9a9a" },
    info: { main: "#81d4fa" },
    background: {
      default: "#111714",
      paper: "#1a211d",
    },
    text: {
      primary: "#e8efe9",
      secondary: "#aebbb0",
    },
    divider: "rgba(202, 226, 204, 0.14)",
    action: {
      hover: "rgba(129, 199, 132, 0.08)",
      selected: "rgba(129, 199, 132, 0.18)",
    },
  },
} as const;

const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...palettes[mode],
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 12,
      htmlFontSize: 12,
      button: {
        fontWeight: 600,
        textTransform: "none",
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            fontSize: "12px",
          },
          body: {
            fontSize: "1rem",
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            boxShadow: "none",
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: ({ theme }) => ({
            backgroundColor: theme.palette.primary.dark,
            color: theme.palette.primary.contrastText,
            fontWeight: 600,
          }),
        },
      },
    },
  });

export const useAppTheme = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const themePreference = useThemePreferenceStore(
    (state) => state.themePreference,
  );
  const setThemePreference = useThemePreferenceStore(
    (state) => state.setThemePreference,
  );

  const resolvedMode = useMemo<PaletteMode>(() => {
    if (themePreference === "system") {
      return prefersDarkMode ? "dark" : "light";
    }
    return themePreference;
  }, [prefersDarkMode, themePreference]);

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return { theme, themePreference, setThemePreference };
};

import { createTheme, useMediaQuery } from "@mui/material";
import { useMemo } from "react";
import { useThemePreferenceStore } from "./useThemePreferenceStore";

const createAppTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: { mode },
    // palette: {
    //   mode,
    //   primary: {
    //     main: '#2e7d32', // VegyFresh Green
    //   },
    //   secondary: {
    //     main: '#f57c00', // Orange
    //   },
    //   background: {
    //     default: mode === 'dark' ? '#121212' : '#f5f5f5',
    //     paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    //   },
    // },
    // typography: {
    //   fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    //   fontSize: 12,
    //   htmlFontSize: 12,
    // },
    // components: {
    //   MuiCssBaseline: {
    //     styleOverrides: {
    //       html: {
    //         fontSize: '12px',
    //       },
    //       body: {
    //         fontSize: '1rem',
    //       },
    //       'th.MuiTableCell-root, td.MuiTableCell-root': {
    //         padding: '1rem 0.5rem !important',
    //         lineHeight: '1 !important',
    //         height: 'auto !important',
    //         boxSizing: 'border-box !important',
    //       },
    //       '.MuiTable-root .MuiTableRow-root > .MuiTableCell-root': {
    //         padding: '1rem 0.5rem !important',
    //       },
    //       '.MuiTable-root': {
    //         display: 'table',
    //         borderCollapse: 'collapse',
    //         borderSpacing: 0,
    //         width: '100%',
    //       },
    //       '.MuiTableHead-root': {
    //         display: 'table-header-group',
    //       },
    //       '.MuiTableBody-root': {
    //         display: 'table-row-group',
    //       },
    //       '.MuiTableRow-root': {
    //         display: 'table-row',
    //         height: 'auto',
    //       },
    //       '.MuiTableCell-root': {
    //         display: 'table-cell',
    //         verticalAlign: 'middle',
    //       },
    //       '.MuiTableCell-root .MuiIconButton-root': {
    //         padding: '0.25rem !important',
    //       },
    //       '.MuiTableCell-root .MuiIconButton-root .MuiSvgIcon-root': {
    //         fontSize: '1rem !important',
    //       },
    //     },
    //   },
    //   MuiTextField: {
    //     styleOverrides: {
    //       root: {
    //         margin: '0.6667rem 0',
    //       },
    //     },
    //   },
    //   MuiFormControl: {
    //     styleOverrides: {
    //       marginNormal: {
    //         marginTop: '1.3333rem',
    //         marginBottom: '0.6667rem',
    //       },
    //       marginDense: {
    //         marginTop: '0.6667rem',
    //         marginBottom: '0.3333rem',
    //       },
    //     },
    //   },
    //   MuiInputLabel: {
    //     styleOverrides: {
    //       root: {
    //         fontSize: '1rem',
    //       },
    //     },
    //   },
    //   MuiInputBase: {
    //     styleOverrides: {
    //       input: {
    //         fontSize: '1rem',
    //         lineHeight: '1.5rem',
    //       },
    //     },
    //   },
    //   MuiOutlinedInput: {
    //     styleOverrides: {
    //       root: {
    //         fontSize: '1rem',
    //         '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    //           borderWidth: '0.1667rem',
    //         },
    //         '& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall': {
    //           padding: '0.5rem 0.75rem',
    //         },
    //         '& .MuiOutlinedInput-input.MuiInputBase-inputAdornedStart.MuiInputBase-inputSizeSmall': {
    //           paddingLeft: 0,
    //         },
    //       },
    //       input: {
    //         padding: '0.75rem 0.875rem',
    //       },
    //       notchedOutline: {
    //         borderWidth: '0.0833rem',
    //       },
    //     },
    //   },
    //   MuiFormHelperText: {
    //     styleOverrides: {
    //       root: {
    //         fontSize: '1rem',
    //         marginTop: '0.3333rem',
    //         marginLeft: '1.1667rem',
    //         marginRight: '1.1667rem',
    //       },
    //     },
    //   },
    //   MuiButton: {
    //     styleOverrides: {
    //       root: {
    //         textTransform: 'capitalize',
    //         fontSize: '1rem',
    //         padding: '0.5rem 1.3333rem',
    //       },
    //       sizeSmall: {
    //         padding: '0.3333rem 1rem',
    //       },
    //       sizeLarge: {
    //         padding: '0.6667rem 1.6667rem',
    //       },
    //     },
    //   },
    //   MuiIconButton: {
    //     styleOverrides: {
    //       root: {
    //         padding: '0.6667rem',
    //         fontSize: '1rem',
    //         '& .MuiSvgIcon-root': {
    //           fontSize: '1.5rem',
    //         },
    //       },
    //       sizeSmall: {
    //         padding: '0.5rem',
    //         '& .MuiSvgIcon-root': {
    //           fontSize: '1.25rem',
    //         },
    //       },
    //       sizeLarge: {
    //         padding: '0.8333rem',
    //         '& .MuiSvgIcon-root': {
    //           fontSize: '1.75rem',
    //         },
    //       },
    //     },
    //   },
    //   MuiTableCell: {
    //     styleOverrides: {
    //       root: {
    //         // padding: '1rem 0.5rem',
    //         height: 'auto',
    //         boxSizing: 'border-box',
    //         lineHeight: 1,
    //         display: 'table-cell',
    //         verticalAlign: 'middle',
    //       },
    //       head: {
    //         // padding: '1rem 0.5rem',
    //         lineHeight: 1,
    //       },
    //       body: {
    //         // padding: '1rem 0.5rem',
    //         lineHeight: 1,
    //       },
    //       footer: {
    //         // padding: '1rem 0.5rem',
    //         lineHeight: 1,
    //       },
    //       sizeSmall: {
    //         // padding: '1rem 0.5rem',
    //       },
    //       sizeMedium: {
    //         // padding: '1rem 0.5rem',
    //       },
    //     },
    //   },
    //   MuiTable: {
    //     styleOverrides: {
    //       root: {
    //         borderCollapse: 'collapse',
    //         borderSpacing: 0,
    //       },
    //     },
    //   },
    //   MuiTableHead: {
    //     styleOverrides: {
    //       root: {
    //         '& .MuiTableCell-root': {
    //           padding: '1rem 0.5rem',
    //         },
    //       },
    //     },
    //   },
    //   MuiTableBody: {
    //     styleOverrides: {
    //       root: {
    //         '& .MuiTableCell-root': {
    //           padding: '1rem 0.5rem',
    //         },
    //       },
    //     },
    //   },
    //   MuiTableRow: {
    //     styleOverrides: {
    //       root: {
    //         '& > .MuiTableCell-root': {
    //           padding: '1rem 0.5rem',
    //         },
    //       },
    //     },
    //   },
    // },
  });

export const useAppTheme = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const themePreference = useThemePreferenceStore(
    (state) => state.themePreference,
  );
  const setThemePreference = useThemePreferenceStore(
    (state) => state.setThemePreference,
  );

  const resolvedMode = useMemo<"light" | "dark">(() => {
    if (themePreference === "system") {
      return prefersDarkMode ? "dark" : "light";
    }
    return themePreference;
  }, [prefersDarkMode, themePreference]);

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return { theme, themePreference, setThemePreference };
};

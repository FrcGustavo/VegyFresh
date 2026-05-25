import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Box, CircularProgress, CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import MainLayout from './layout/MainLayout';
import { AuthProvider, useAuth } from './auth/AuthContext';

const OrdersList = lazy(() => import('./modules/orders/pages/OrdersList'));
const ProductsList = lazy(() => import('./modules/products/pages/ProductsList'));
const PriceListsList = lazy(() => import('./modules/products/price-lists/pages/PriceListsList'));
const ClientsList = lazy(() => import('./modules/clients/pages/ClientsList'));
const SuppliersList = lazy(() => import('./modules/suppliers/pages/SuppliersList'));
const UsersList = lazy(() => import('./modules/users/pages/UsersList'));
const SettingsPage = lazy(() => import('./modules/settings/pages/SettingsPage'));
const LoginPage = lazy(() => import('./modules/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('./modules/auth/pages/SignupPage'));

type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCE_STORAGE_KEY = 'vegyfresh-theme-preference';

const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';

  const storedPreference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  if (
    storedPreference === 'light'
    || storedPreference === 'dark'
    || storedPreference === 'system'
  ) {
    return storedPreference;
  }

  return 'system';
};

const createAppTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#2e7d32', // VegyFresh Green
    },
    secondary: {
      main: '#f57c00', // Orange
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 12,
    htmlFontSize: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontSize: '12px',
        },
        body: {
          fontSize: '1rem',
        },
        'th.MuiTableCell-root, td.MuiTableCell-root': {
          padding: '1rem 0.5rem !important',
          lineHeight: '1 !important',
          height: 'auto !important',
          boxSizing: 'border-box !important',
        },
        '.MuiTable-root .MuiTableRow-root > .MuiTableCell-root': {
          padding: '1rem 0.5rem !important',
        },
        '.MuiTable-root': {
          display: 'table',
          borderCollapse: 'collapse',
          borderSpacing: 0,
          width: '100%',
        },
        '.MuiTableHead-root': {
          display: 'table-header-group',
        },
        '.MuiTableBody-root': {
          display: 'table-row-group',
        },
        '.MuiTableRow-root': {
          display: 'table-row',
          height: 'auto',
        },
        '.MuiTableCell-root': {
          display: 'table-cell',
          verticalAlign: 'middle',
        },
        '.MuiTableCell-root .MuiIconButton-root': {
          padding: '0.25rem !important',
        },
        '.MuiTableCell-root .MuiIconButton-root .MuiSvgIcon-root': {
          fontSize: '1rem !important',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          margin: '0.6667rem 0',
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        marginNormal: {
          marginTop: '1.3333rem',
          marginBottom: '0.6667rem',
        },
        marginDense: {
          marginTop: '0.6667rem',
          marginBottom: '0.3333rem',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: '1rem',
          lineHeight: '1.5rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '0.1667rem',
          },
          '& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall': {
            padding: '0.5rem 0.75rem',
          },
          '& .MuiOutlinedInput-input.MuiInputBase-inputAdornedStart.MuiInputBase-inputSizeSmall': {
            paddingLeft: 0,
          },
        },
        input: {
          padding: '0.75rem 0.875rem',
        },
        notchedOutline: {
          borderWidth: '0.0833rem',
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          marginTop: '0.3333rem',
          marginLeft: '1.1667rem',
          marginRight: '1.1667rem',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'capitalize',
          fontSize: '1rem',
          padding: '0.5rem 1.3333rem',
        },
        sizeSmall: {
          padding: '0.3333rem 1rem',
        },
        sizeLarge: {
          padding: '0.6667rem 1.6667rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '0.6667rem',
          fontSize: '1rem',
          '& .MuiSvgIcon-root': {
            fontSize: '1.5rem',
          },
        },
        sizeSmall: {
          padding: '0.5rem',
          '& .MuiSvgIcon-root': {
            fontSize: '1.25rem',
          },
        },
        sizeLarge: {
          padding: '0.8333rem',
          '& .MuiSvgIcon-root': {
            fontSize: '1.75rem',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          // padding: '1rem 0.5rem',
          height: 'auto',
          boxSizing: 'border-box',
          lineHeight: 1,
          display: 'table-cell',
          verticalAlign: 'middle',
        },
        head: {
          // padding: '1rem 0.5rem',
          lineHeight: 1,
        },
        body: {
          // padding: '1rem 0.5rem',
          lineHeight: 1,
        },
        footer: {
          // padding: '1rem 0.5rem',
          lineHeight: 1,
        },
        sizeSmall: {
          // padding: '1rem 0.5rem',
        },
        sizeMedium: {
          // padding: '1rem 0.5rem',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'collapse',
          borderSpacing: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '1rem 0.5rem',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '1rem 0.5rem',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '& > .MuiTableCell-root': {
            padding: '1rem 0.5rem',
          },
        },
      },
    },
  },
});

function RouteFallback() {
  return (
    <Box role="status" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <CircularProgress />
    </Box>
  );
}

/** Redirects unauthenticated users to /login. Shows a spinner while auth initialises. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredThemePreference);

  const resolvedMode = useMemo<'light' | 'dark'>(() => {
    if (themePreference === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return themePreference;
  }, [prefersDarkMode, themePreference]);

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  useEffect(() => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, themePreference);
  }, [themePreference]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/orders" replace />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="products" element={<ProductsList />} />
                <Route path="price-lists" element={<PriceListsList />} />
                <Route path="clients" element={<ClientsList />} />
                <Route path="suppliers" element={<SuppliersList />} />
                <Route path="users" element={<UsersList />} />
                <Route
                  path="settings"
                  element={(
                    <SettingsPage
                      themePreference={themePreference}
                      onThemePreferenceChange={setThemePreference}
                    />
                  )}
                />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authStorage } from './authStorage';
import { authApi, type AuthUser, type LoginPayload, type SignupPayload } from './authApi';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    authApi
      .me(accessToken)
      .then((user) => {
        setState({ user, isAuthenticated: true, isLoading: false });
      })
      .catch(() => {
        authStorage.clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  // Listen for forced logout (e.g. refresh failed in api.ts)
  useEffect(() => {
    const handleForceLogout = () => {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    };

    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (payload: LoginPayload): Promise<void> => {
    const tokens = await authApi.login(payload);
    authStorage.setTokens(tokens.access_token, tokens.refresh_token);
    setState({ user: tokens.user, isAuthenticated: true, isLoading: false });
  };

  const signup = async (payload: SignupPayload): Promise<void> => {
    const tokens = await authApi.signup(payload);
    authStorage.setTokens(tokens.access_token, tokens.refresh_token);
    setState({ user: tokens.user, isAuthenticated: true, isLoading: false });
  };

  const logout = async (): Promise<void> => {
    const accessToken = authStorage.getAccessToken();
    if (accessToken) {
      await authApi.logout(accessToken);
    }

    authStorage.clearTokens();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

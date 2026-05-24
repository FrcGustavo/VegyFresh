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
    const restoreSession = async () => {
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();
      
      if (!accessToken && !refreshToken) {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      try {
        const response = await authApi.me(accessToken!);
        setState({ user: response.user, isAuthenticated: true, isLoading: false });
      } catch (err) {
        // If me() fails and refresh token exists, attempt refresh+retry
        if (refreshToken) {
          try {
            const refreshedTokens = await authApi.refresh(refreshToken);
            authStorage.setTokens(refreshedTokens.access_token, refreshedTokens.refresh_token);
            const response = await authApi.me(refreshedTokens.access_token);
            setState({ user: response.user, isAuthenticated: true, isLoading: false });
          } catch {
            authStorage.clearTokens();
            setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          authStorage.clearTokens();
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    };

    restoreSession();
  }, []);

  // Listen for forced logout (e.g. refresh failed in api.ts)
  useEffect(() => {
    const handleForceLogout = () => {
      authStorage.clearTokens();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    };

    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (payload: LoginPayload): Promise<void> => {
    const response = await authApi.login(payload);
    authStorage.setTokens(response.access_token, response.refresh_token);
    setState({ user: response.user, isAuthenticated: true, isLoading: false });
  };

  const signup = async (payload: SignupPayload): Promise<void> => {
    const response = await authApi.signup(payload);
    authStorage.setTokens(response.access_token, response.refresh_token);
    setState({ user: response.user, isAuthenticated: true, isLoading: false });
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

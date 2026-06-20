import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authStorage } from "./authStorage";
import {
  authApi,
  type LoginPayload,
  type SignupPayload,
} from "./authApi";
import { AuthContext } from "./auth-context.store";
import type { AuthState } from "./auth-context.store";

const isAuthRejected = (error: unknown): boolean => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    return status === 401 || status === 403;
  }

  return false;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();

      if (!accessToken && !refreshToken) {
        setState({
          user: null,
          organization: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      try {
        if (accessToken) {
          try {
            const response = await authApi.me(accessToken);
            setState({
              user: response.user,
              organization: response.organization,
              role: response.role,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          } catch {
            if (!refreshToken) {
              authStorage.clearTokens();
              setState({
                user: null,
                organization: null,
                role: null,
                isAuthenticated: false,
                isLoading: false,
              });
              return;
            }
          }
        }

        if (!refreshToken) {
          authStorage.clearTokens();
          setState({
            user: null,
            organization: null,
            role: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        const refreshedTokens = await authApi.refresh(refreshToken);
        authStorage.setTokens(
          refreshedTokens.access_token,
          refreshedTokens.refresh_token,
        );
        const response = await authApi.me(refreshedTokens.access_token);
        setState({
          user: response.user,
          organization: response.organization,
          role: response.role,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        if (isAuthRejected(error)) {
          authStorage.clearTokens();
          setState({
            user: null,
            organization: null,
            role: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // Non-auth errors (e.g. network failure) should not be treated as
        // authenticated — downstream code assumes isAuthenticated === true
        // implies a non-null user.
        setState({
          user: null,
          organization: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    restoreSession();
  }, []);

  // Listen for forced logout (e.g. refresh failed in api.ts)
  useEffect(() => {
    const handleForceLogout = () => {
      authStorage.clearTokens();
      setState({
        user: null,
        organization: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    authStorage.setTokens(response.access_token, response.refresh_token);
    setState({
      user: response.user,
      organization: response.organization,
      role: response.role,
      isAuthenticated: true,
      isLoading: false,
    });
    return response;
  };

  const refreshSession = async (): Promise<void> => {
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      throw new Error("No hay sesión activa");
    }

    const response = await authApi.me(accessToken);
    setState({
      user: response.user,
      organization: response.organization,
      role: response.role,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const signup = async (payload: SignupPayload) => {
    const response = await authApi.signup(payload);
    // Signup now returns tokens; log user in immediately
    authStorage.setTokens(response.access_token, response.refresh_token);
    setState({
      user: response.user,
      organization: null, // No organization yet
      role: response.role,
      isAuthenticated: true,
      isLoading: false,
    });
    return response;
  };

  const logout = async (): Promise<void> => {
    const accessToken = authStorage.getAccessToken();
    if (accessToken) {
      await authApi.logout(accessToken);
    }

    authStorage.clearTokens();
    setState({
      user: null,
      organization: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

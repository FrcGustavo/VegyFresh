import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authStorage } from "./authStorage";
import {
  authApi,
  type AuthOrganization,
  type AuthRole,
  type AuthUser,
  type LoginPayload,
  type SetupOrganizationAuthPayload,
  type SignupResponse,
  type SignupPayload,
} from "./authApi";

interface AuthState {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => ReturnType<typeof authApi.login>;
  signup: (payload: SignupPayload) => Promise<SignupResponse>;
  completeOrganization: (
    payload: SetupOrganizationAuthPayload,
  ) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

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

  const completeOrganization = async (
    payload: SetupOrganizationAuthPayload,
  ): Promise<void> => {
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      throw new Error("No hay sesión activa para completar la organización");
    }
    const response = await authApi.setupOrganizationAuth(accessToken, payload);
    // Update tokens with org-scoped ones
    authStorage.setTokens(response.access_token, response.refresh_token);
    setState({
      user: response.user,
      organization: response.organization,
      role: response.role,
      isAuthenticated: true,
      isLoading: false,
    });
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
        completeOrganization,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

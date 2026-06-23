import { createContext } from "react";
import type {
  AuthOrganization,
  AuthRole,
  AuthUser,
  LoginPayload,
  SignupPayload,
  SignupResponse,
} from "./authApi";

export interface AuthState {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<{
    access_token: string;
    refresh_token: string;
    user: AuthUser;
    organization: AuthOrganization | null;
    role: AuthRole;
  }>;
  signup: (payload: SignupPayload) => Promise<SignupResponse>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

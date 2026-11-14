import { createContext } from "react";
import type {
  AuthOrganization,
  AuthRole,
  AuthUser,
} from "@/infrastructure/auth/authApi";

export interface AuthState {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

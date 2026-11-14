import type { AuthRole } from "@/domain/auth/AuthRole";

export type { AuthRole } from "@/domain/auth/AuthRole";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  folio: string;
}

export interface SignupResponse {
  user: AuthUser;
  role: AuthRole;
  access_token: string;
  refresh_token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

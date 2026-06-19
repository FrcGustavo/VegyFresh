import { API_URL } from "../api";

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

export interface AuthRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthSessionResponse {
  user: AuthUser;
  organization: AuthOrganization | null;
  role: AuthRole;
  access_token: string;
  refresh_token: string;
}

export interface SignupResponse {
  user: AuthUser;
  role: AuthRole;
  access_token: string;
  refresh_token: string;
}

export interface SetupOrganizationPayload {
  email: string;
  password: string;
  name: string;
  logo_url?: string | null;
  legal_name?: string | null;
  organization_email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  product_folio_prefix?: string | null;
  price_list_folio_prefix?: string | null;
  order_folio_prefix?: string | null;
  client_folio_prefix?: string | null;
  supplier_folio_prefix?: string | null;
  purchase_folio_prefix?: string | null;
}

export interface AuthRefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface AuthContextResponse {
  user: AuthUser;
  organization: AuthOrganization | null;
  role: AuthRole;
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

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

async function postPublic<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new AuthApiError(err.message || "Error de autenticación", res.status);
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    postPublic<AuthSessionResponse>("/auth/login", payload),

  signup: (payload: SignupPayload) =>
    postPublic<SignupResponse>("/auth/signup", payload),

  setupOrganization: (payload: SetupOrganizationPayload) =>
    postPublic<AuthSessionResponse>("/auth/setup-organization", payload),

  refresh: (refreshToken: string) =>
    postPublic<AuthRefreshResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    }),

  me: (accessToken: string): Promise<AuthContextResponse> =>
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(async (r) => {
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { message?: string };
        throw new AuthApiError(
          err.message || "Error de autenticación",
          r.status,
        );
      }
      return r.json() as Promise<AuthContextResponse>;
    }),

  logout: (accessToken: string): Promise<void> =>
    fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(() => undefined)
      .catch(() => undefined),
};

import { API_URL } from '../api';

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

export interface AuthMembership {
  id: string;
  role: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  organization: AuthOrganization;
  membership: AuthMembership;
  access_token: string;
  refresh_token: string;
}

export interface AuthRefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface AuthContextResponse {
  user: AuthUser;
  organization: AuthOrganization;
  membership: AuthMembership;
}

export interface LoginPayload {
  email: string;
  password: string;
  organization_id?: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  organization_name: string;
}

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

async function postPublic<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new AuthApiError(err.message || 'Error de autenticación', res.status);
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    postPublic<AuthSessionResponse>('/auth/login', payload),

  signup: (payload: SignupPayload) =>
    postPublic<AuthSessionResponse>('/auth/signup', payload),

  refresh: (refreshToken: string) =>
    postPublic<AuthRefreshResponse>('/auth/refresh', { refresh_token: refreshToken }),

  me: (accessToken: string): Promise<AuthContextResponse> =>
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { message?: string };
        throw new AuthApiError(err.message || 'Error de autenticación', r.status);
      }
      return r.json() as Promise<AuthContextResponse>;
    }),

  logout: (accessToken: string): Promise<void> =>
    fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(() => undefined).catch(() => undefined),
};

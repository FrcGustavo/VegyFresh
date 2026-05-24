import { API_URL } from '../api';

export interface AuthUser {
  sub: string;
  email: string;
  org_id: string;
  membership_id: string;
  role: string;
  sid: string;
  permissions: string[];
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
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

async function postPublic<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || 'Error de autenticación');
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    postPublic<AuthTokensResponse>('/auth/login', payload),

  signup: (payload: SignupPayload) =>
    postPublic<AuthTokensResponse>('/auth/signup', payload),

  refresh: (refreshToken: string) =>
    postPublic<AuthTokensResponse>('/auth/refresh', { refresh_token: refreshToken }),

  me: (accessToken: string): Promise<AuthUser> =>
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json() as Promise<AuthUser>),

  logout: (accessToken: string): Promise<void> =>
    fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(() => undefined).catch(() => undefined),
};

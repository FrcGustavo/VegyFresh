export type PublicProfile = {
  user?: { id?: string; name?: string; email?: string } | null;
  organization?: { id?: string; name?: string; folio?: string } | null;
  role?: { id?: string; name?: string; permissions?: string[] } | null;
};

export type SessionResult = {
  authenticated: boolean | null;
  profile?: PublicProfile;
  cookies: string[];
};

export type ApiProxy = {
  handle(request: Request): Promise<Response>;
  getSession(input: {
    cookieHeader?: string;
    origin: string;
  }): Promise<SessionResult>;
};

export type BffProxyOptions = {
  apiBaseUrl: string;
  openapiPaths: Record<string, Record<string, unknown>>;
  fetchImpl?: typeof fetch;
  publicOrigin: string;
  issuer: string;
  clientId: string;
  clientSecret?: string;
  sessionSecret: string;
  internalIssuerUrl?: string;
  application?: "admin" | "portal";
  profilePath?: string;
  scopes?: string;
};

export function createBffProxy(options: BffProxyOptions): ApiProxy;

export function createBffProxyCache(): (
  fingerprint: string,
  options: BffProxyOptions,
) => ApiProxy;

export function createConfigFingerprint(values: unknown): string;

export type PortalBffProxyOptions = {
  apiBaseUrl: string;
  openapiPaths: Record<string, Record<string, unknown>>;
  fetchImpl?: typeof fetch;
  publicOrigin: string;
  issuer: string;
  clientId: string;
  clientSecret?: string;
  sessionSecret: string;
  internalIssuerUrl?: string;
  application: "portal";
  profilePath: string;
  scopes: string;
};

export function createBffProxy(options: PortalBffProxyOptions): {
  handle(request: Request): Promise<Response>;
  getSession(input: {
    cookieHeader?: string | null;
    origin: string;
  }): Promise<{
    authenticated: boolean | null;
    cookies: string[];
    profile?: unknown;
  }>;
};

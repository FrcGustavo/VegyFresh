import { createServerFn } from "@tanstack/react-start";
import type { PublicProfile } from "../server/apiProxy.mjs";

export type PublicSession = { provider: "keycloak"; authenticated: boolean | null } & PublicProfile;

export const readServerSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSession> => {
    const [{ getRequestHeader, setResponseHeader, setResponseStatus }, { createApiProxy, getPublicOrigin }] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("../server/apiProxyRuntime.server"),
    ]);
    setResponseHeader("Cache-Control", "private, no-store");
    setResponseHeader("Vary", "Cookie");
    try {
      const session = await createApiProxy().getSession({ cookieHeader: getRequestHeader("cookie"), origin: getPublicOrigin() });
      if (session.cookies.length) setResponseHeader("Set-Cookie", session.cookies);
      if (session.authenticated === null) setResponseStatus(503);
      return { provider: "keycloak", authenticated: session.authenticated, ...session.profile };
    } catch {
      setResponseStatus(503);
      return { provider: "keycloak", authenticated: null };
    }
  },
);

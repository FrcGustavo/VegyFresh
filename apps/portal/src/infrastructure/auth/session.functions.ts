import { createServerFn } from "@tanstack/react-start";
import { appendResponseHeader, getRequest, setResponseHeader } from "@tanstack/react-start/server";

export const getPublicSession = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vary", "Cookie");
  try {
    const { readServerSession } = await import("./serverSession.server");
    const { session, cookies } = await readServerSession(getRequest());
    for (const cookie of cookies) appendResponseHeader("Set-Cookie", cookie);
    return session;
  } catch {
    return { provider: "keycloak" as const, authenticated: null };
  }
});

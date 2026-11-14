import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { PortalSessionSnapshot } from "../../domain/auth/auth.types";
import { getPublicSession } from "../../session.functions";

export function StartSignIn({ initialSession }: { initialSession: PortalSessionSnapshot }) {
  const [logoutFailed, setLogoutFailed] = useState(false);
  const { data: session, refetch, isFetching } = useQuery({
    queryKey: ["portal-session"], queryFn: () => getPublicSession(), initialData: initialSession, staleTime: Infinity,
  });

  async function logout() {
    setLogoutFailed(false);
    try {
      const response = await fetch("/session/logout", { method: "POST" });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" ||
          !("redirectTo" in result) || result.redirectTo !== "/session/logout/redirect") throw new Error("Logout failed");
      window.location.assign(result.redirectTo);
    } catch {
      setLogoutFailed(true);
    }
  }

  return <main>
    <h1>VegyFresh Portal</h1>
    {session.authenticated === null ? <><p>We could not check your session. Please try again.</p><button type="button" disabled={isFetching} onClick={() => void refetch()}>Retry</button></> :
      session.authenticated ? <><p>Signed in as {session.client?.name}.</p><a href="/portal/dashboard">Open dashboard</a><button type="button" onClick={() => void logout()}>Sign out</button>{logoutFailed && <p role="alert">Sign out failed. Please try again.</p>}</> : <><p>Sign in to access your customer portal.</p><a href="/session/login?returnTo=%2Fportal%2Fdashboard">Sign in</a></>}
  </main>;
}

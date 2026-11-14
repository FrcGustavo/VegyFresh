import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthState } from "@/auth/auth-context.store";
import type { PublicSession } from "@/infrastructure/auth/serverSession";
import {
  endBrowserSession,
  refreshBrowserSession,
} from "@/infrastructure/auth/browserSession";

function toAuthState(session: PublicSession): AuthState {
  const user = session.user;
  const organization = session.organization;
  const role = session.role;
  return {
    user:
      user?.id && user.name && user.email
        ? { id: user.id, name: user.name, email: user.email }
        : null,
    organization:
      organization?.id && organization.name
        ? {
            id: organization.id,
            name: organization.name,
            folio: organization.folio ?? "",
          }
        : null,
    role:
      role?.id && role.name
        ? { id: role.id, name: role.name, permissions: role.permissions ?? [] }
        : null,
    isAuthenticated:
      session.authenticated === true &&
      Boolean(user?.id && user.name && user.email),
    isLoading: false,
  };
}

export function StartAuthProvider({
  session,
  children,
}: {
  session: PublicSession;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(() => ({
    session,
    state: toAuthState(session),
  }));
  const state =
    snapshot.session === session ? snapshot.state : toAuthState(session);

  useEffect(() => {
    const expired = () => window.location.assign("/login");
    window.addEventListener("auth:logout", expired);
    return () => window.removeEventListener("auth:logout", expired);
  }, []);

  async function refreshSession() {
    const next = await refreshBrowserSession();
    setSnapshot({ session, state: toAuthState(next) });
  }

  async function logout() {
    window.location.assign(await endBrowserSession());
  }

  const unsupported = async (): Promise<never> => {
    throw new Error("Usa el inicio de sesión seguro");
  };
  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: unsupported,
        signup: unsupported,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

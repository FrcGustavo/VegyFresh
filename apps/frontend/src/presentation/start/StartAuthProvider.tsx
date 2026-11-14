import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthState } from "@/auth/auth-context.store";
import type { PublicSession } from "@/infrastructure/auth/serverSession";

function toAuthState(session: PublicSession): AuthState {
  const user = session.user;
  const organization = session.organization;
  const role = session.role;
  return {
    user: user?.id && user.name && user.email ? { id: user.id, name: user.name, email: user.email } : null,
    organization: organization?.id && organization.name ? { id: organization.id, name: organization.name, folio: organization.folio ?? "" } : null,
    role: role?.id && role.name ? { id: role.id, name: role.name, permissions: role.permissions ?? [] } : null,
    isAuthenticated: session.authenticated === true && Boolean(user?.id && user.name && user.email),
    isLoading: false,
  };
}

export function StartAuthProvider({ session, children }: { session: PublicSession; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(() => ({ session, state: toAuthState(session) }));
  const state = snapshot.session === session ? snapshot.state : toAuthState(session);

  useEffect(() => {
    const expired = () => window.location.assign("/login");
    window.addEventListener("auth:logout", expired);
    return () => window.removeEventListener("auth:logout", expired);
  }, []);

  async function refreshSession() {
    const response = await fetch("/session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo actualizar la sesión");
    const next = (await response.json()) as PublicSession;
    if (next.authenticated !== true) throw new Error("No hay sesión activa");
    setSnapshot({ session, state: toAuthState(next) });
  }

  async function logout() {
    const response = await fetch("/session/logout", { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error("No se pudo cerrar la sesión");
    const { redirectTo } = (await response.json()) as { redirectTo?: string };
    window.location.assign(redirectTo || "/login");
  }

  const unsupported = async (): Promise<never> => { throw new Error("Usa el inicio de sesión seguro"); };
  return <AuthContext.Provider value={{ ...state, login: unsupported, signup: unsupported, refreshSession, logout }}>{children}</AuthContext.Provider>;
}

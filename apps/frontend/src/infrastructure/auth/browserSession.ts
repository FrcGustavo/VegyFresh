import type { PublicSession } from "./serverSession";

export async function refreshBrowserSession(): Promise<PublicSession> {
  const response = await fetch("/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo actualizar la sesión");
  const session = (await response.json()) as PublicSession;
  if (session.authenticated !== true) throw new Error("No hay sesión activa");
  return session;
}

export async function endBrowserSession(): Promise<string> {
  const response = await fetch("/session/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("No se pudo cerrar la sesión");
  const { redirectTo } = (await response.json()) as { redirectTo?: string };
  return redirectTo || "/login";
}

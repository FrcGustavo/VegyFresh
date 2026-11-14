/* eslint-disable react-refresh/only-export-components -- File routes export their configuration. */
import { createFileRoute } from "@tanstack/react-router";
import { readServerSession } from "@/infrastructure/auth/serverSession";

export const Route = createFileRoute("/")({
  loader: () => readServerSession(),
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  component: SessionPage,
});
function SessionPage() {
  const session = Route.useLoaderData();
  return <main><h1>VegyFresh</h1>{session.authenticated === null ? <p>No se pudo verificar tu sesión. Inténtalo de nuevo.</p> : session.authenticated ? <p>Sesión iniciada: {session.user?.name}</p> : <a href="/session/login">Iniciar sesión</a>}</main>;
}

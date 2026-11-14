import { createFileRoute } from "@tanstack/react-router";
import { handleSession } from "./-sessionHandler";

export const Route = createFileRoute("/session/$")({
  server: { handlers: { GET: handleSession, POST: handleSession } },
});

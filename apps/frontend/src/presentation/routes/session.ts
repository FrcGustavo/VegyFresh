import { createFileRoute } from "@tanstack/react-router";
import { proxy } from "./-proxy";
export const Route = createFileRoute("/session")({ server: { handlers: { GET: proxy } } });

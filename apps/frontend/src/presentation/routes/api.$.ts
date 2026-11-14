import { createFileRoute } from "@tanstack/react-router";
import { proxy } from "./-proxy";
export const Route = createFileRoute("/api/$")({ server: { handlers: { GET: proxy, HEAD: proxy, POST: proxy, PUT: proxy, PATCH: proxy, DELETE: proxy } } });

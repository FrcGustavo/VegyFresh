import { createFileRoute } from "@tanstack/react-router";

const proxy = async ({ request }: { request: Request }) => {
  try {
    const { handlePortalRequest } = await import("../infrastructure/server/proxyRuntime.server");
    return await handlePortalRequest(request);
  } catch {
    return Response.json(
      { statusCode: 503, message: "The API proxy is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  }
};

export const Route = createFileRoute("/api/$")({
  server: { handlers: { GET: proxy, HEAD: proxy, POST: proxy, PUT: proxy, PATCH: proxy, DELETE: proxy } },
});

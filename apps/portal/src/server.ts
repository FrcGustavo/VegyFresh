import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { handlePortalRequest, privateResponse } from "./infrastructure/server/proxyRuntime.server";

export default createServerEntry({
  async fetch(request, options) {
    const path = new URL(request.url).pathname;
    if (path === "/login" && request.method === "GET") {
      return privateResponse(new Response(null, { status: 303, headers: { Location: "/" } }));
    }
    if (path === "/session" || path.startsWith("/session/")) return handlePortalRequest(request);
    return privateResponse(await handler.fetch(request, options));
  },
});

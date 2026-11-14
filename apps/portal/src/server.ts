import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { privateResponse } from "./infrastructure/server/proxyRuntime.server";

export default createServerEntry({
  async fetch(request, options) {
    const path = new URL(request.url).pathname;
    if (["/login", "/signup", "/register", "/setup-password"].includes(path) && request.method === "GET") {
      return privateResponse(new Response(null, { status: 303, headers: { Location: "/" } }));
    }
    return privateResponse(await handler.fetch(request, options));
  },
});

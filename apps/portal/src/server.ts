import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { privateResponse } from "./infrastructure/server/proxyRuntime.server";

export default createServerEntry({
  async fetch(request, options) {
    return privateResponse(await handler.fetch(request, options));
  },
});

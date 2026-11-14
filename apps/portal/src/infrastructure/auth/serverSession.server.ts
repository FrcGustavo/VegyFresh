import type { PortalSessionSnapshot } from "../../domain/auth/auth.types";
import { getPortalProxy, publicSessionProjection, type PortalProxy } from "../server/proxyRuntime.server";

// Cookies must be applied to the response headers, never serialized into the page.
export async function readServerSession(
  request: Request,
  proxy: PortalProxy = getPortalProxy(),
): Promise<{ session: PortalSessionSnapshot; cookies: string[] }> {
  const result = await proxy.getSession({
    cookieHeader: request.headers.get("cookie"),
    origin: proxy.publicOrigin,
  });
  return { session: publicSessionProjection(result), cookies: result.cookies };
}

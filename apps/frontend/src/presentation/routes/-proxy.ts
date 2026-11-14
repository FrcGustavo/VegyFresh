export async function proxy({ request }: { request: Request }) {
  const { handleProxyRequest } = await import("@/infrastructure/server/apiProxyRuntime.server");
  return handleProxyRequest(request);
}

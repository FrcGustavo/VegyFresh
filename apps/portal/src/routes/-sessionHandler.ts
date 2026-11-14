export async function handleSession({ request }: { request: Request }) {
  try {
    const { handlePortalRequest } = await import("../infrastructure/server/proxyRuntime.server");
    return await handlePortalRequest(request);
  } catch {
    return Response.json(
      { statusCode: 503, message: "The session service is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  }
}

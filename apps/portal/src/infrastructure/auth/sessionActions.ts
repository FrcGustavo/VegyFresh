export async function logoutSession() {
  const response = await fetch("/session/logout", { method: "POST", credentials: "same-origin" });
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== "object" ||
      !("redirectTo" in result) || result.redirectTo !== "/session/logout/redirect") {
    throw new Error("Logout failed");
  }
  window.location.assign(result.redirectTo);
}

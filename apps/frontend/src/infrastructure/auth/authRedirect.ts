function safeReturnTo(value: string | null): string | undefined {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?:2f|5c)/i.test(value)
  ) {
    return undefined;
  }

  try {
    const url = new URL(value, "https://vegyfresh.invalid");
    if (
      url.origin !== "https://vegyfresh.invalid" ||
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/")
    ) {
      return undefined;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

export function buildAuthStartHref(
  action: "login" | "register",
  searchStr: string,
): string {
  const returnTo = safeReturnTo(
    new URLSearchParams(searchStr).get("returnTo"),
  );
  if (!returnTo) {
    return `/session/${action}`;
  }

  const search = new URLSearchParams({ returnTo });
  return `/session/${action}?${search.toString()}`;
}

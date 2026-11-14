import { createServerFn } from "@tanstack/react-start";

export const adminPages = ["orders", "clients", "suppliers", "products", "price-lists", "users", "purchases", "inventory", "organization"] as const;
export type AdminPage = typeof adminPages[number];
export type ServerPage = { identity: string; state: string } | null;

export const readServerPage = createServerFn({ method: "GET" })
  .validator((value: AdminPage) => {
    if (!adminPages.includes(value)) throw new Error("Invalid administrative page");
    return value;
  })
  .handler(async ({ data }): Promise<ServerPage> => {
    const [{ getRequest, appendResponseHeader, setResponseHeader }, { loadServerPage }] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("./serverPage.server"),
    ]);
    setResponseHeader("Cache-Control", "private, no-store");
    setResponseHeader("Vary", "Cookie");
    return loadServerPage(getRequest(), data, (cookie) => appendResponseHeader("Set-Cookie", cookie));
  });

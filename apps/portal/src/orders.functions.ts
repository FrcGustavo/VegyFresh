import { createServerFn } from "@tanstack/react-start";
import { appendResponseHeader, getRequest, setResponseHeader } from "@tanstack/react-start/server";

type OrderRequest = { kind: "list" } | { kind: "detail"; id: string };

export const getServerOrders = createServerFn({ method: "GET" })
  .validator((input: OrderRequest): OrderRequest => {
    if (input?.kind === "list") return { kind: "list" };
    if (input?.kind === "detail" && typeof input.id === "string" && input.id.length <= 200 && input.id.trim()) {
      return { kind: "detail", id: input.id };
    }
    throw new Error("Invalid order request");
  })
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    setResponseHeader("Vary", "Cookie");
    try {
      const { readServerOrders } = await import("./infrastructure/orders/api/serverOrders.server");
      const { orders, cookies } = await readServerOrders(getRequest(), data);
      for (const cookie of cookies) appendResponseHeader("Set-Cookie", cookie);
      return orders;
    } catch {
      // The browser adapter reports errors and supports retry after hydration.
      return null;
    }
  });

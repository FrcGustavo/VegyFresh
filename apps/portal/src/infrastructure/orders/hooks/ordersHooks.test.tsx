import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOrderDetail } from "./useOrderDetail";
import { useOrders } from "./useOrders";

afterEach(() => vi.unstubAllGlobals());

describe("portal order hooks", () => {
  it.each(["list", "detail"] as const)("aborts the %s request when cancelled", async (kind) => {
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => {
      signal = init.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) =>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { unmount } = renderHook(
      () => kind === "list" ? useOrders("APPROVED") : useOrderDetail("order-1"),
      { wrapper },
    );
    await waitFor(() => expect(signal).toBeDefined());
    unmount();
    expect(signal?.aborted).toBe(true);
    client.clear();
  });
});

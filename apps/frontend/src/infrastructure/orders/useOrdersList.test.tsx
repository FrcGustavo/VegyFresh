import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOrdersList } from "./useOrdersList";

vi.mock("../api", () => ({
  ordersQueryOptions: {
    infiniteList: (query: { limit: number }) => ({
      queryKey: ["orders", query],
      initialPageParam: 0,
      queryFn: async ({ pageParam }: { pageParam: number }) =>
        pageParam === 0 ? { data: [{ id: "first" }] } : [{ id: "second" }],
      getNextPageParam: (_page: unknown, pages: unknown[]) =>
        pages.length === 1 ? 1 : undefined,
    }),
  },
}));
function Wrapper({ children }: PropsWithChildren) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
describe("order list data", () => {
  it("flattens both response shapes across pages", async () => {
    const { result } = renderHook(() => useOrdersList({ limit: 1 }), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(result.current.items).toEqual([{ id: "first" }]),
    );
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() =>
      expect(result.current.items).toEqual([{ id: "first" }, { id: "second" }]),
    );
    expect(result.current.hasNextPage).toBe(false);
  });
});

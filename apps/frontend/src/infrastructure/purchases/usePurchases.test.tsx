import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePurchaseEditor } from "./usePurchases";

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  products: vi.fn(),
  suppliers: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../query", () => ({
  purchasesQueryOptions: {
    detail: (id: string) => ({
      queryKey: ["purchase", id],
      queryFn: () => mocks.detail(id),
    }),
  },
  productsQueryOptions: {
    list: () => ({ queryKey: ["products"], queryFn: mocks.products }),
  },
  suppliersQueryOptions: {
    list: () => ({ queryKey: ["suppliers"], queryFn: mocks.suppliers }),
  },
  purchasesMutationOptions: {
    create: () => ({ mutationFn: mocks.create }),
    update: () => ({ mutationFn: mocks.update }),
  },
}));
function Wrapper({ children }: PropsWithChildren) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
describe("purchase editor data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.detail.mockResolvedValue({ id: "purchase-1" });
    mocks.products.mockResolvedValue([]);
    mocks.suppliers.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: "new" });
  });
  it("loads lookups and detail only while the modal is open and saves through the mutation", async () => {
    const { result, rerender } = renderHook(
      ({ open, id }) => usePurchaseEditor(open, id),
      { initialProps: { open: false, id: "purchase-1" }, wrapper: Wrapper },
    );
    expect(mocks.detail).not.toHaveBeenCalled();
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.suppliers).not.toHaveBeenCalled();
    rerender({ open: true, id: "purchase-1" });
    await waitFor(() =>
      expect(result.current.detail.data).toEqual({ id: "purchase-1" }),
    );
    expect(mocks.products).toHaveBeenCalledOnce();
    expect(mocks.suppliers).toHaveBeenCalledOnce();
    const input = {
      supplier_id: "s",
      purchase_date: "2026-01-01",
      notes: null,
      items: [],
    };
    await act(async () => {
      await result.current.create.mutateAsync(input);
    });
    expect(mocks.create).toHaveBeenCalledWith(input, expect.any(Object));
  });
});

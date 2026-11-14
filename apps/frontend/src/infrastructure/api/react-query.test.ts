import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  productEditorMutationOptions,
  productPricesQueryOptions,
  productsQueryOptions,
} from "./react-query";
import type { Product } from "./types";

describe("integración de productos con React Query", () => {
  it("invalida productos y precios después del flujo compartido", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;
    const options = productEditorMutationOptions.save(queryClient);
    const onSuccess = options.onSuccess as unknown as (
      product: Product,
      variables: Parameters<typeof productEditorMutationOptions.save>[0],
    ) => Promise<void>;

    await onSuccess(
      { id: "product-1" } as Product,
      {
        id: "product-1",
        product: {
          name: "Tomate",
          supplier_id: "supplier-1",
          unit: "kg",
        },
        prices: [],
        existingPrices: [],
      } as never,
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: productsQueryOptions.keys.all,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: productPricesQueryOptions.keys.all,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: productsQueryOptions.keys.detail("product-1"),
    });
  });
});

it("propaga la cancelación y pagina con el total del servidor", async () => {
  const { clientsApi } = await import("./resources");
  const { clientsQueryOptions } = await import("./react-query");
  const getAll = vi.spyOn(clientsApi, "getAll").mockResolvedValue({
    data: [{ id: "1" }, { id: "2" }] as never,
    total: 3,
  });
  const signal = new AbortController().signal;
  const options = clientsQueryOptions.infiniteList({ limit: "2" });
  const page = await options.queryFn!({ pageParam: 0, signal } as never);

  expect(getAll).toHaveBeenCalledWith({ limit: "2", offset: 0 }, { signal });
  expect(options.getNextPageParam!(page, [page], 0, [0])).toBe(2);
  expect(
    options.getNextPageParam!({ data: [{}] as never, total: 3 }, [], 2, []),
  ).toBeUndefined();
  getAll.mockRestore();
});

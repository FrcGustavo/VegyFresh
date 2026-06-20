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
      variables: Parameters<
        typeof productEditorMutationOptions.save
      >[0],
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

import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/resources";
import {
  productsQueryOptions,
  productPricesQueryOptions,
  priceListsQueryOptions,
} from "./resources";

export const productEditorMutationOptions = {
  save: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["products", "save-with-prices"],
      mutationFn: apiClient.workflows.saveProductWithPrices,
      onSuccess: (_product, { id }) =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: productsQueryOptions.keys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: productPricesQueryOptions.keys.all,
          }),
          ...(id
            ? [
                queryClient.invalidateQueries({
                  queryKey: productsQueryOptions.keys.detail(id),
                }),
              ]
            : []),
        ]).then(() => undefined),
    }),
};

export const priceListEditorMutationOptions = {
  save: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["price-lists", "save-with-products"],
      mutationFn: apiClient.workflows.savePriceListWithProducts,
      onSuccess: (_priceList, { id }) =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: priceListsQueryOptions.keys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: productPricesQueryOptions.keys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: productsQueryOptions.keys.all,
          }),
          ...(id
            ? [
                queryClient.invalidateQueries({
                  queryKey: priceListsQueryOptions.keys.detail(id),
                }),
              ]
            : []),
        ]).then(() => undefined),
    }),
};

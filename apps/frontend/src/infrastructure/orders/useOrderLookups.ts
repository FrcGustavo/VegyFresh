import { clientsQueryOptions, productsQueryOptions } from "../query";
import { type ClientListQuery, type ProductListQuery } from "../api";
import { useQueryClient } from "@tanstack/react-query";

export function useOrderLookups() {
  const queryClient = useQueryClient();

  return {
    searchClients: (query: ClientListQuery) =>
      queryClient.fetchQuery(clientsQueryOptions.list(query)),
    searchProducts: (query: ProductListQuery) =>
      queryClient.fetchQuery(productsQueryOptions.list(query)),
  };
}

import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { purchasesApi } from "../api/resources";
import type { CreatePurchaseInput, UpdatePurchaseInput } from "../api/types";
import { inventoryQueryOptions } from "./inventory";

export const purchasesQueryOptions = {
  keys: {
    all: ["purchases"] as const,
    list: ["purchases", "list"] as const,
    detail: (id: string) => ["purchases", "detail", id] as const,
  },
  list: () =>
    queryOptions({
      queryKey: purchasesQueryOptions.keys.list,
      queryFn: ({ signal }) => purchasesApi.list({ signal }),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: purchasesQueryOptions.keys.detail(id),
      queryFn: ({ signal }) => purchasesApi.get(id, { signal }),
    }),
};

export const purchasesMutationOptions = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["purchases", "create"],
      mutationFn: (input: CreatePurchaseInput) => purchasesApi.create(input),
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: purchasesQueryOptions.keys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: inventoryQueryOptions.keys.all,
          }),
        ]).then(() => undefined),
    }),
  update: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["purchases", "update"],
      mutationFn: ({ id, input }: { id: string; input: UpdatePurchaseInput }) =>
        purchasesApi.update(id, input),
      onSuccess: (_data, { id }) =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: purchasesQueryOptions.keys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: purchasesQueryOptions.keys.detail(id),
          }),
          queryClient.invalidateQueries({
            queryKey: inventoryQueryOptions.keys.all,
          }),
        ]).then(() => undefined),
    }),
  remove: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["purchases", "remove"],
      mutationFn: (id: string) => purchasesApi.remove(id),
      onSuccess: (_data, id) => {
        queryClient.removeQueries({
          queryKey: purchasesQueryOptions.keys.detail(id),
        });
        return Promise.all([
          queryClient.invalidateQueries({
            queryKey: purchasesQueryOptions.keys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: inventoryQueryOptions.keys.all,
          }),
        ]).then(() => undefined);
      },
    }),
};

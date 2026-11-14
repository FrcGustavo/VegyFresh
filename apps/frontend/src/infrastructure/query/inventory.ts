import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api/resources";
import type { CreateInventoryAdjustmentInput } from "../api/types";

export const inventoryQueryOptions = {
  keys: {
    all: ["inventory"] as const,
    stock: ["inventory", "stock"] as const,
    movements: ["inventory", "movements"] as const,
  },
  stock: () =>
    queryOptions({
      queryKey: inventoryQueryOptions.keys.stock,
      queryFn: ({ signal }) => inventoryApi.get({ signal }),
    }),
  movements: () =>
    queryOptions({
      queryKey: inventoryQueryOptions.keys.movements,
      queryFn: ({ signal }) => inventoryApi.getMovements({ signal }),
    }),
};

export const inventoryMutationOptions = {
  createAdjustment: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["inventory", "create-adjustment"],
      mutationFn: (input: CreateInventoryAdjustmentInput) =>
        inventoryApi.createAdjustment(input),
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: inventoryQueryOptions.keys.all,
        }),
    }),
};

import { useInfiniteQuery } from "@tanstack/react-query";
import { ordersQueryOptions } from "../query";

type Params = Parameters<typeof ordersQueryOptions.infiniteList>[0];
export function useOrdersList(query: Params) {
  const result = useInfiniteQuery(ordersQueryOptions.infiniteList(query));
  return {
    ...result,
    items: (result.data?.pages ?? []).flatMap((page) =>
      Array.isArray(page) ? page : page?.data || [],
    ),
  };
}

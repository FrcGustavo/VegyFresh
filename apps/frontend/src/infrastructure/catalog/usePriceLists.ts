import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  priceListEditorMutationOptions,
  priceListsQueryOptions,
  productsQueryOptions,
} from "../api";

type Params = Parameters<typeof priceListsQueryOptions.infiniteList>[0];
export function usePriceLists(query: Params) {
  const result = useInfiniteQuery({
    ...priceListsQueryOptions.infiniteList(query),
    placeholderData: (previous) => previous,
  });
  return {
    ...result,
    items: (result.data?.pages ?? []).flatMap((page) =>
      Array.isArray(page) ? page : (page?.data ?? []),
    ),
  };
}
export function usePriceListEditor(id?: string) {
  const client = useQueryClient();
  const products = useQuery(
    productsQueryOptions.list({ limit: "200", order_by: "name", order: "asc" }),
  );
  const detail = useQuery({
    ...priceListsQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });
  const save = useMutation(priceListEditorMutationOptions.save(client));
  return { products, detail, save };
}

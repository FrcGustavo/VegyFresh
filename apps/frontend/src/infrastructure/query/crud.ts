import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

type CrudApi<Resource, CreateInput, UpdateInput, ListQuery extends object> = {
  getAll: (
    query?: ListQuery,
    options?: RequestInit,
  ) => Promise<Resource[] | { data: Resource[]; total: number }>;
  get: (id: string, options?: RequestInit) => Promise<Resource>;
  create: (input: CreateInput) => Promise<Resource>;
  update: (id: string, input: UpdateInput) => Promise<Resource>;
  remove: (id: string) => Promise<void>;
};

type QueryLimit<ListQuery> = ListQuery extends { limit?: infer Limit }
  ? NonNullable<Limit>
  : string | number;

type InfiniteListQuery<ListQuery> = Omit<ListQuery, "offset" | "limit"> & {
  limit: QueryLimit<ListQuery>;
};

const getPageItems = <Resource>(
  page: Resource[] | { data: Resource[]; total: number },
) => (Array.isArray(page) ? page : page.data);

export function createCrudQueryOptions<
  Resource,
  CreateInput,
  UpdateInput,
  ListQuery extends object,
>(
  resource: string,
  api: CrudApi<Resource, CreateInput, UpdateInput, ListQuery>,
) {
  const keys = {
    all: [resource] as const,
    lists: () => [resource, "list"] as const,
    list: (query?: ListQuery) => [resource, "list", query ?? {}] as const,
    infiniteLists: () => [resource, "infinite-list"] as const,
    infiniteList: (query: InfiniteListQuery<ListQuery>) =>
      [resource, "infinite-list", query] as const,
    details: () => [resource, "detail"] as const,
    detail: (id: string) => [resource, "detail", id] as const,
  };

  const queries = {
    keys,
    list: (query?: ListQuery) =>
      queryOptions({
        queryKey: keys.list(query),
        queryFn: ({ signal }) => api.getAll(query, { signal }),
      }),
    infiniteList: (query: InfiniteListQuery<ListQuery>) =>
      infiniteQueryOptions({
        queryKey: keys.infiniteList(query),
        initialPageParam: 0,
        queryFn: ({ pageParam, signal }) =>
          api.getAll(
            {
              ...query,
              offset: pageParam,
            } as ListQuery,
            { signal },
          ),
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const itemCount = getPageItems(lastPage).length;
          const nextOffset = Number(lastPageParam) + itemCount;
          const reachedTotal =
            !Array.isArray(lastPage) && nextOffset >= lastPage.total;

          return itemCount < Number(query.limit) || reachedTotal
            ? undefined
            : nextOffset;
        },
      }),
    detail: (id: string) =>
      queryOptions({
        queryKey: keys.detail(id),
        queryFn: ({ signal }) => api.get(id, { signal }),
      }),
  };

  const mutations = {
    create: (queryClient: QueryClient) =>
      mutationOptions({
        mutationKey: [resource, "create"],
        mutationFn: api.create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      }),
    update: (queryClient: QueryClient) =>
      mutationOptions({
        mutationKey: [resource, "update"],
        mutationFn: ({ id, input }: { id: string; input: UpdateInput }) =>
          api.update(id, input),
        onSuccess: (_data, { id }) =>
          Promise.all([
            queryClient.invalidateQueries({ queryKey: keys.lists() }),
            queryClient.invalidateQueries({ queryKey: keys.infiniteLists() }),
            queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
          ]).then(() => undefined),
      }),
    remove: (queryClient: QueryClient) =>
      mutationOptions({
        mutationKey: [resource, "remove"],
        mutationFn: api.remove,
        onSuccess: (_data, id) => {
          queryClient.removeQueries({ queryKey: keys.detail(id) });
          return Promise.all([
            queryClient.invalidateQueries({ queryKey: keys.lists() }),
            queryClient.invalidateQueries({ queryKey: keys.infiniteLists() }),
          ]).then(() => undefined);
        },
      }),
  };

  return { queries, mutations };
}

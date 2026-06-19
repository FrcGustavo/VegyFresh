import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import {
  aiApi,
  clientsApi,
  inventoryApi,
  ordersApi,
  organizationsApi,
  priceListsApi,
  productPricesApi,
  productsApi,
  purchasesApi,
  suppliersApi,
  usersApi,
  whatsappApi,
} from "./resources";
import type {
  ClientListQuery,
  CreateAiInput,
  CreateInventoryAdjustmentInput,
  CreatePurchaseInput,
  CreateWhatsappInput,
  OrderListQuery,
  PriceListListQuery,
  ProductListQuery,
  SupplierListQuery,
  UserListQuery,
} from "./types";

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

type InfiniteListQuery<ListQuery> = Omit<ListQuery, "offset"> & {
  limit: string;
};

const getPageItems = <Resource>(
  page: Resource[] | { data: Resource[]; total: number },
) => (Array.isArray(page) ? page : page.data);

function createCrudQueryOptions<
  Resource,
  CreateInput,
  UpdateInput,
  ListQuery extends object,
>(resource: string, api: CrudApi<Resource, CreateInput, UpdateInput, ListQuery>) {
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
              offset: String(pageParam),
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
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: keys.all }),
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

const clientsReactQuery = createCrudQueryOptions<
  Awaited<ReturnType<typeof clientsApi.get>>,
  Parameters<typeof clientsApi.create>[0],
  Parameters<typeof clientsApi.update>[1],
  ClientListQuery
>("clients", clientsApi);
const usersReactQuery = createCrudQueryOptions<
  Awaited<ReturnType<typeof usersApi.get>>,
  Parameters<typeof usersApi.create>[0],
  Parameters<typeof usersApi.update>[1],
  UserListQuery
>("users", usersApi);
const suppliersReactQuery = createCrudQueryOptions<
  Awaited<ReturnType<typeof suppliersApi.get>>,
  Parameters<typeof suppliersApi.create>[0],
  Parameters<typeof suppliersApi.update>[1],
  SupplierListQuery
>("suppliers", suppliersApi);
const ordersReactQuery = createCrudQueryOptions<
  Awaited<ReturnType<typeof ordersApi.get>>,
  Parameters<typeof ordersApi.create>[0],
  Parameters<typeof ordersApi.update>[1],
  OrderListQuery
>("orders", ordersApi);
const productsReactQuery = createCrudQueryOptions<
  Awaited<ReturnType<typeof productsApi.get>>,
  Parameters<typeof productsApi.create>[0],
  Parameters<typeof productsApi.update>[1],
  ProductListQuery
>("products", productsApi);
const priceListsReactQuery = createCrudQueryOptions<
  Awaited<ReturnType<typeof priceListsApi.get>>,
  Parameters<typeof priceListsApi.create>[0],
  Parameters<typeof priceListsApi.update>[1],
  PriceListListQuery
>("price-lists", priceListsApi);
const productPricesReactQuery = createCrudQueryOptions(
  "product-prices",
  productPricesApi,
);

export const clientsQueryOptions = clientsReactQuery.queries;
export const clientsMutationOptions = clientsReactQuery.mutations;
export const usersQueryOptions = usersReactQuery.queries;
export const usersMutationOptions = usersReactQuery.mutations;
export const suppliersQueryOptions = suppliersReactQuery.queries;
export const suppliersMutationOptions = suppliersReactQuery.mutations;
export const ordersQueryOptions = ordersReactQuery.queries;
export const ordersMutationOptions = ordersReactQuery.mutations;
export const productsQueryOptions = productsReactQuery.queries;
export const productsMutationOptions = productsReactQuery.mutations;
export const priceListsQueryOptions = priceListsReactQuery.queries;
export const priceListsMutationOptions = priceListsReactQuery.mutations;
export const productPricesQueryOptions = productPricesReactQuery.queries;
export const productPricesMutationOptions = productPricesReactQuery.mutations;

export const organizationsQueryOptions = {
  keys: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", "detail", id] as const,
  },
  detail: (id: string) =>
    queryOptions({
      queryKey: organizationsQueryOptions.keys.detail(id),
      queryFn: ({ signal }) => organizationsApi.get(id, { signal }),
    }),
};

export const organizationsMutationOptions = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["organizations", "create"],
      mutationFn: organizationsApi.create,
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: organizationsQueryOptions.keys.all,
        }),
    }),
  update: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["organizations", "update"],
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: Parameters<typeof organizationsApi.update>[1];
      }) => organizationsApi.update(id, input),
      onSuccess: (_data, { id }) =>
        queryClient.invalidateQueries({
          queryKey: organizationsQueryOptions.keys.detail(id),
        }),
    }),
};

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
};

export const aiMutationOptions = {
  interpret: () =>
    mutationOptions({
      mutationKey: ["ai", "interpret"],
      mutationFn: (input: CreateAiInput) => aiApi.interpret(input),
    }),
};

export const whatsappMutationOptions = {
  send: () =>
    mutationOptions({
      mutationKey: ["whatsapp", "send"],
      mutationFn: (input: CreateWhatsappInput) => whatsappApi.send(input),
    }),
};

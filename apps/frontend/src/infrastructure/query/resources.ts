import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  clientsApi,
  usersApi,
  suppliersApi,
  ordersApi,
  productsApi,
  priceListsApi,
  productPricesApi,
  rolesApi,
} from "../api/resources";
import type {
  ClientListQuery,
  UserListQuery,
  SupplierListQuery,
  OrderListQuery,
  ProductListQuery,
  PriceListListQuery,
  CreateRoleInput,
} from "../api/types";
import { createCrudQueryOptions } from "./crud";

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

export const rolesQueryOptions = {
  keys: { all: ["roles"] as const },
  list: () =>
    queryOptions({
      queryKey: rolesQueryOptions.keys.all,
      queryFn: ({ signal }) => rolesApi.getAll({ signal }),
    }),
};

export const rolesMutationOptions = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationKey: ["roles", "create"],
      mutationFn: (input: CreateRoleInput) => rolesApi.create(input),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: rolesQueryOptions.keys.all }),
    }),
};
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

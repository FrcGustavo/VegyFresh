import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  saveProduct,
  saveUser,
  type ProductFormData,
  type ProductPriceRow,
  type UserFormData,
} from "../../application/catalog/saveCatalog";
import {
  priceListsQueryOptions,
  productEditorMutationOptions,
  productsQueryOptions,
  rolesMutationOptions,
  rolesQueryOptions,
  suppliersQueryOptions,
  usersMutationOptions,
  usersQueryOptions,
} from "../query";
import { type ProductListQuery, type UserListQuery } from "../api";

type UserListParams = Omit<UserListQuery, "offset" | "limit"> & {
  limit: string;
};
type ProductListParams = Omit<ProductListQuery, "offset" | "limit"> & {
  limit: string;
};

export function useUsersList(query: UserListParams) {
  const result = useInfiniteQuery({
    ...usersQueryOptions.infiniteList(query),
    placeholderData: (previous) => previous,
  });
  return {
    ...result,
    items: (result.data?.pages ?? []).flatMap((page) =>
      Array.isArray(page) ? page : page.data,
    ),
  };
}
export function useProductsList(query: ProductListParams) {
  const result = useInfiniteQuery({
    ...productsQueryOptions.infiniteList(query),
    placeholderData: (previous) => previous,
  });
  return {
    ...result,
    items: (result.data?.pages ?? []).flatMap((page) =>
      Array.isArray(page) ? page : page.data,
    ),
  };
}
export function useUserEditor(id?: string) {
  const client = useQueryClient();
  const detail = useQuery({
    ...usersQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });
  const roles = useQuery(rolesQueryOptions.list());
  const createRole = useMutation(rolesMutationOptions.create(client));
  const create = useMutation(usersMutationOptions.create(client));
  const update = useMutation(usersMutationOptions.update(client));
  return {
    detail,
    roles: Array.isArray(roles.data) ? roles.data : (roles.data?.data ?? []),
    isSaving: create.isPending || update.isPending,
    isCreatingRole: createRole.isPending,
    createAdminRole: () =>
      createRole.mutate({ name: "Admin", permissions: [] }),
    save: (form: UserFormData) =>
      saveUser(form, id, {
        create: (input) => create.mutateAsync(input),
        update: (userId, input) => update.mutateAsync({ id: userId, input }),
      }),
  };
}
export function useProductEditor(id?: string) {
  const client = useQueryClient();
  const detail = useQuery({
    ...productsQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });
  const suppliers = useQuery(
    suppliersQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
  );
  const priceLists = useQuery(
    priceListsQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
  );
  const mutation = useMutation(productEditorMutationOptions.save(client));
  return {
    detail,
    suppliers: suppliers.data,
    priceLists: priceLists.data,
    isSaving: mutation.isPending,
    save: (
      form: ProductFormData,
      prices: ProductPriceRow[],
      existingPrices: Array<{
        id: string;
        price_list_id: string;
        price: number;
      }>,
    ) =>
      saveProduct(form, prices, existingPrices, id, {
        save: (input) => mutation.mutateAsync(input),
      }),
  };
}

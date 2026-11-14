import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  saveClient,
  saveSupplier,
  type ClientFormData,
  type SupplierFormData,
} from "../../application/contacts/saveContact";
import {
  clientsMutationOptions,
  clientsQueryOptions,
  priceListsQueryOptions,
  suppliersMutationOptions,
  suppliersQueryOptions,
} from "../query";
import { type ClientListQuery, type SupplierListQuery } from "../api";

type ClientListParams = Omit<ClientListQuery, "offset" | "limit"> & { limit: string };
type SupplierListParams = Omit<SupplierListQuery, "offset" | "limit"> & { limit: string };

export function useClientsList(query: ClientListParams) {
  const result = useInfiniteQuery({ ...clientsQueryOptions.infiniteList(query), placeholderData: (previous) => previous });
  return { ...result, items: (result.data?.pages ?? []).flatMap((page) => Array.isArray(page) ? page : page.data) };
}

export function useSuppliersList(query: SupplierListParams) {
  const result = useInfiniteQuery({ ...suppliersQueryOptions.infiniteList(query), placeholderData: (previous) => previous });
  return { ...result, items: (result.data?.pages ?? []).flatMap((page) => Array.isArray(page) ? page : page.data) };
}

export function useClientEditor(id?: string) {
  const queryClient = useQueryClient();
  const detail = useQuery({ ...clientsQueryOptions.detail(id ?? ""), enabled: !!id });
  const priceLists = useQuery(priceListsQueryOptions.list({ limit: "200", order_by: "name", order: "asc" }));
  const create = useMutation(clientsMutationOptions.create(queryClient));
  const update = useMutation(clientsMutationOptions.update(queryClient));
  return {
    detail,
    priceLists: Array.isArray(priceLists.data) ? priceLists.data : priceLists.data?.data ?? [],
    isSaving: create.isPending || update.isPending,
    save: (form: ClientFormData) => saveClient(form, id, {
      create: (input) => create.mutateAsync(input),
      update: (clientId, input) => update.mutateAsync({ id: clientId, input }),
    }),
  };
}

export function useSupplierEditor(id?: string) {
  const queryClient = useQueryClient();
  const detail = useQuery({ ...suppliersQueryOptions.detail(id ?? ""), enabled: !!id });
  const create = useMutation(suppliersMutationOptions.create(queryClient));
  const update = useMutation(suppliersMutationOptions.update(queryClient));
  return {
    detail,
    isSaving: create.isPending || update.isPending,
    save: (form: SupplierFormData) => saveSupplier(form, id, {
      create: (input) => create.mutateAsync(input),
      update: (supplierId, input) => update.mutateAsync({ id: supplierId, input }),
    }),
  };
}

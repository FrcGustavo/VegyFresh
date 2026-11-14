import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  productsQueryOptions,
  purchasesMutationOptions,
  purchasesQueryOptions,
  suppliersQueryOptions,
} from "../api";

export function usePurchasesList() {
  return useQuery(purchasesQueryOptions.list());
}

export function usePurchaseEditor(isOpen: boolean, id?: string) {
  const client = useQueryClient();
  const detail = useQuery({
    ...purchasesQueryOptions.detail(id ?? ""),
    enabled: isOpen && !!id,
  });
  const suppliers = useQuery({
    ...suppliersQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
    enabled: isOpen,
  });
  const products = useQuery({
    ...productsQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
    enabled: isOpen,
  });
  const create = useMutation(purchasesMutationOptions.create(client));
  const update = useMutation(purchasesMutationOptions.update(client));
  return {
    detail,
    suppliers,
    products,
    create,
    update,
    isSaving: create.isPending || update.isPending,
  };
}

export function useWarehousePurchaseEditor(isOpen: boolean) {
  const client = useQueryClient();
  const suppliers = useQuery({
    ...suppliersQueryOptions.list(),
    enabled: isOpen,
  });
  const products = useQuery({
    ...productsQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
    enabled: isOpen,
  });
  const create = useMutation(purchasesMutationOptions.create(client));
  return { suppliers, products, create };
}

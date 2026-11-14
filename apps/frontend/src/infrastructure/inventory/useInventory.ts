import { useQuery } from "@tanstack/react-query";
import { inventoryQueryOptions, purchasesQueryOptions } from "../api";

export function useInventoryStock() {
  return useQuery(inventoryQueryOptions.stock());
}

export function useWarehouseData() {
  const inventory = useQuery(inventoryQueryOptions.stock());
  const purchases = useQuery(purchasesQueryOptions.list());
  const movements = useQuery(inventoryQueryOptions.movements());
  return { inventory, purchases, movements };
}

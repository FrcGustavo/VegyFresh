import { useQuery } from "@tanstack/react-query";
import { clientsQueryOptions, ordersQueryOptions, usersQueryOptions } from "../query";
import { useOrderLookups } from "./useOrderLookups";
import { useOrderWriter } from "./useOrderWriter";

export function useOrderEditor(id?: string) {
  const detail = useQuery({
    ...ordersQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });
  const clients = useQuery(clientsQueryOptions.list());
  const users = useQuery(usersQueryOptions.list());
  return {
    detail,
    clients,
    users,
    lookups: useOrderLookups(),
    writer: useOrderWriter(),
  };
}

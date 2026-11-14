import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  organizationsMutationOptions,
  organizationsQueryOptions,
} from "../api";

export function useOrganizationEditor(id: string) {
  const client = useQueryClient();
  const detail = useQuery({
    ...organizationsQueryOptions.detail(id),
    enabled: !!id,
  });
  const create = useMutation(organizationsMutationOptions.create(client));
  const update = useMutation(organizationsMutationOptions.update(client));
  return { detail, create, update };
}

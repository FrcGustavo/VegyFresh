import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { organizationsApi } from "../api/resources";

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

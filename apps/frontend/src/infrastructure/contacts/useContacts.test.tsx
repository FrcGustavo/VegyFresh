import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { clientsApi, clientsQueryOptions, priceListsApi } from "../api";
import { useClientEditor, useClientsList } from "./useContacts";

afterEach(() => vi.restoreAllMocks());

it("paginates with an abort signal and invalidates a list after saving", async () => {
  const getAll = vi.spyOn(clientsApi, "getAll").mockResolvedValue({ data: [{ id: "c-1", name: "Old" }] as never, total: 1 });
  vi.spyOn(priceListsApi, "getAll").mockResolvedValue([]);
  vi.spyOn(clientsApi, "create").mockResolvedValue({ id: "c-2" } as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const list = renderHook(() => useClientsList({ limit: "10" }), { wrapper });
  await waitFor(() => expect(list.result.current.items).toHaveLength(1));
  expect(getAll).toHaveBeenCalledWith({ limit: "10", offset: 0 }, { signal: expect.any(AbortSignal) });
  expect(queryClient.getQueryData(clientsQueryOptions.keys.infiniteList({ limit: "10" }))).toBeDefined();
  const editor = renderHook(() => useClientEditor(), { wrapper });
  await act(async () => {
    await editor.result.current.save({ name: "New", phone_number: "555", email: "", country: "", state: "", city: "", postal_code: "", address: "", suburb: "", external_number: "", internal_number: "", avatar_url: "", price_list_id: "" });
  });
  await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2));
  list.unmount(); editor.unmount(); queryClient.clear();
});

it("aborts an in-flight list request when its consumer unmounts", async () => {
  let signal: AbortSignal | undefined;
  vi.spyOn(clientsApi, "getAll").mockImplementation((_query, options) => {
    signal = options?.signal as AbortSignal;
    return new Promise(() => {});
  });
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const list = renderHook(() => useClientsList({ limit: "10" }), { wrapper });
  await waitFor(() => expect(signal).toBeDefined());
  list.unmount();
  expect(signal?.aborted).toBe(true);
  queryClient.clear();
});

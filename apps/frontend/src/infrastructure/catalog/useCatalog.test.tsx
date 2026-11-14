import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  productsApi,
  priceListsApi,
  rolesApi,
  suppliersApi,
  usersApi,
} from "../api";
import {
  useProductEditor,
  useProductsList,
  useUserEditor,
  useUsersList,
} from "./useCatalog";

afterEach(() => vi.restoreAllMocks());
it("retains pagination signals and user cache invalidation", async () => {
  const getAll = vi
    .spyOn(usersApi, "getAll")
    .mockResolvedValue({ data: [{ id: "u1" }] as never, total: 1 });
  vi.spyOn(usersApi, "create").mockResolvedValue({ id: "u2" } as never);
  vi.spyOn(rolesApi, "getAll").mockResolvedValue([]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const list = renderHook(() => useUsersList({ limit: "10" }), { wrapper });
  await waitFor(() => expect(list.result.current.items).toHaveLength(1));
  expect(getAll).toHaveBeenCalledWith(
    { limit: "10", offset: 0 },
    { signal: expect.any(AbortSignal) },
  );
  const editor = renderHook(() => useUserEditor(), { wrapper });
  await act(async () => {
    await editor.result.current.save({
      name: "Ana",
      email: "a@b.com",
      password: "password-1234",
      role_id: "r1",
      avatar_url: "",
    });
  });
  await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2));
  list.unmount();
  editor.unmount();
  client.clear();
});
it("invalidates product list after a product save", async () => {
  const getAll = vi
    .spyOn(productsApi, "getAll")
    .mockResolvedValue({ data: [{ id: "p1" }] as never, total: 1 });
  vi.spyOn(productsApi, "create").mockResolvedValue({ id: "p2" } as never);
  vi.spyOn(priceListsApi, "getAll").mockResolvedValue([]);
  vi.spyOn(suppliersApi, "getAll").mockResolvedValue([]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const list = renderHook(() => useProductsList({ limit: "10" }), { wrapper });
  await waitFor(() => expect(list.result.current.items).toHaveLength(1));
  const editor = renderHook(() => useProductEditor(), { wrapper });
  await act(async () => {
    await editor.result.current.save(
      {
        name: "Apple",
        description: "",
        stock: 1,
        supplier_id: "s1",
        unit: "kg",
        images: [],
      },
      [],
      [],
    );
  });
  await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2));
  list.unmount();
  editor.unmount();
  client.clear();
});

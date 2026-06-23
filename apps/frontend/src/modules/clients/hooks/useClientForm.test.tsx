import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useClientForm } from "./useClientForm";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("../../../api", () => ({
  clientsQueryOptions: {
    detail: (id: string) => ({
      queryKey: ["clients", "detail", id],
      queryFn: async () => undefined,
    }),
  },
  priceListsQueryOptions: {
    list: () => ({ queryKey: ["price-lists"], queryFn: async () => [] }),
  },
  clientsMutationOptions: {
    create: () => ({ mutationFn: mocks.createClient }),
    update: () => ({ mutationFn: vi.fn() }),
  },
}));

function Wrapper({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("useClientForm", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ id: "client-1" });
  });

  it("valida los campos obligatorios", () => {
    const { result } = renderHook(() => useClientForm(), { wrapper: Wrapper });
    act(() => result.current.handleSubmit("save"));
    expect(result.current.formError).toBe(
      "Completa el nombre y el teléfono del cliente.",
    );
  });

  it("normaliza campos opcionales al crear", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useClientForm(undefined, onSuccess), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.handleChange({
        target: { name: "name", value: "  Cliente Uno  " },
      });
      result.current.handleChange({
        target: { name: "phone_number", value: " 5551234567 " },
      });
    });
    act(() => result.current.handleSubmit("save"));

    await waitFor(() => {
      expect(mocks.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Cliente Uno",
          phone_number: "5551234567",
          email: null,
          price_list_id: null,
        }),
        expect.any(Object),
      );
      expect(onSuccess).toHaveBeenCalledWith("save", { id: "client-1" });
    });
  });
});

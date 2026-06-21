import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOrderForm } from "./useOrderForm";

const mocks = vi.hoisted(() => ({
  orders: new Map<string, unknown>(),
  createOrder: vi.fn(),
}));

vi.mock("../../../api", () => ({
  ordersQueryOptions: {
    detail: (id: string) => ({
      queryKey: ["orders", "detail", id],
      queryFn: async () => mocks.orders.get(id),
    }),
  },
  clientsQueryOptions: {
    list: () => ({ queryKey: ["clients"], queryFn: async () => [] }),
  },
  usersQueryOptions: {
    list: () => ({
      queryKey: ["users"],
      queryFn: async () => [{ id: "user-1" }],
    }),
  },
  productsQueryOptions: {
    list: () => ({ queryKey: ["products"], queryFn: async () => [] }),
  },
  ordersMutationOptions: {
    create: () => ({ mutationFn: mocks.createOrder }),
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

describe("useOrderForm", () => {
  beforeEach(() => {
    mocks.orders.clear();
    mocks.createOrder.mockReset();
    mocks.createOrder.mockResolvedValue({ id: "order-1" });
  });

  it("mantiene una fila de captura al cargar y eliminar partidas", async () => {
    mocks.orders.set("order-1", {
      id: "order-1",
      client_id: "client-1",
      user_id: "user-1",
      status: "PENDING_REVIEW",
      origin: "WHATSAPP",
      folio: "PED-001",
      created_at: "2026-06-20T00:00:00.000Z",
      client: { id: "client-1", folio: "CLI-001", name: "Cliente" },
      items: [
        {
          id: "item-1",
          product_id: "product-1",
          quantity: 2,
          unit_price: 15,
          product: {
            id: "product-1",
            folio: "PROD-001",
            name: "Manzana",
            unit: "kg",
          },
        },
      ],
    });
    const { result } = renderHook(() => useOrderForm("order-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items.at(-1)?.product_id).toBe("");
    });

    act(() => result.current.removeItemField(0));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.product_id).toBe("");
    act(() => result.current.addItemField());
    expect(result.current.items).toHaveLength(1);
  });

  it("muestra validaciones dentro del formulario", () => {
    const { result } = renderHook(() => useOrderForm(), { wrapper: Wrapper });
    act(() => result.current.handleSubmit("save"));
    expect(result.current.formError).toBe(
      "Selecciona un cliente válido por folio o nombre.",
    );
  });

  it("crea un pedido con partidas válidas", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useOrderForm(undefined, onSuccess),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.formData.user_id).toBe("user-1"));
    act(() => {
      result.current.handleChange({
        target: { name: "client_id", value: "client-1" },
      });
      result.current.updateItemField(0, "product_id", "product-1");
      result.current.updateItemField(0, "quantity", "2");
      result.current.updateItemField(0, "unit_price", "15.5");
    });
    act(() => result.current.handleSubmit("save"));

    await waitFor(() => {
      expect(mocks.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "client-1",
          user_id: "user-1",
          items: [
            { product_id: "product-1", quantity: 2, unit_price: 15.5 },
          ],
        }),
        expect.any(Object),
      );
      expect(onSuccess).toHaveBeenCalledWith("save", { id: "order-1" });
    });
  });
});

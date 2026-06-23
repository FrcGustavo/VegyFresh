import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePriceListForm } from "./usePriceListForm";

const mocks = vi.hoisted(() => ({
  priceLists: new Map<string, unknown>(),
  savePriceList: vi.fn(),
}));

vi.mock("../../../api", () => ({
  productsQueryOptions: {
    list: () => ({
      queryKey: ["products", "list"],
      queryFn: async () => [
        { id: "product-1", name: "Manzana" },
        { id: "product-2", name: "Pera" },
      ],
    }),
  },
  priceListsQueryOptions: {
    detail: (id: string) => ({
      queryKey: ["price-lists", "detail", id],
      queryFn: async () => mocks.priceLists.get(id),
    }),
  },
  priceListEditorMutationOptions: {
    save: () => ({ mutationFn: mocks.savePriceList }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

describe("usePriceListForm", () => {
  beforeEach(() => {
    mocks.priceLists.clear();
    mocks.savePriceList.mockReset();
    mocks.savePriceList.mockResolvedValue({
      id: "price-list-1",
      name: "Menudeo",
    });
  });

  it("inicia una lista nueva con una fila vacía", () => {
    const { result } = renderHook(() => usePriceListForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.productsList).toHaveLength(1);
    expect(result.current.productsList[0]).toMatchObject({
      product_id: "",
      price: "",
    });
  });

  it("agrega una fila vacía al cargar una lista con o sin precios", async () => {
    mocks.priceLists.set("empty", {
      id: "empty",
      name: "Vacía",
      productPrices: [],
    });
    mocks.priceLists.set("assigned", {
      id: "assigned",
      name: "Asignada",
      productPrices: [
        {
          id: "price-1",
          product_id: "product-1",
          product: { id: "product-1", name: "Manzana" },
          price: 25,
        },
      ],
    });

    const empty = renderHook(() => usePriceListForm("empty"), {
      wrapper: createWrapper(),
    });
    const assigned = renderHook(() => usePriceListForm("assigned"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(empty.result.current.productsList).toHaveLength(1);
      expect(empty.result.current.productsList[0]?.product_id).toBe("");
      expect(assigned.result.current.productsList).toHaveLength(2);
      expect(assigned.result.current.productsList.at(-1)?.product_id).toBe("");
    });
  });

  it("mantiene una sola fila vacía al agregar o eliminar productos", () => {
    const { result } = renderHook(() => usePriceListForm(), {
      wrapper: createWrapper(),
    });

    act(() => result.current.addProductField());
    expect(result.current.productsList).toHaveLength(1);

    act(() => {
      result.current.selectProduct(0, {
        id: "product-1",
        name: "Manzana",
      });
      result.current.updateProductField(0, "price", "25");
    });
    act(() => result.current.addProductField());
    expect(result.current.productsList).toHaveLength(2);

    act(() => result.current.removeProductField(0));
    expect(result.current.productsList).toHaveLength(1);
    expect(result.current.productsList[0]?.product_id).toBe("");
  });

  it("ignora la fila vacía al guardar", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => usePriceListForm(undefined, onSuccess),
      { wrapper: createWrapper() },
    );

    act(() => result.current.setName("Menudeo"));
    act(() => {
      result.current.selectProduct(0, {
        id: "product-1",
        name: "Manzana",
      });
      result.current.updateProductField(0, "price", "0");
    });
    act(() => result.current.addProductField());
    act(() => result.current.handleSubmit("save"));

    await waitFor(() =>
      expect(mocks.savePriceList).toHaveBeenCalledWith(
        {
          id: undefined,
          name: "Menudeo",
          products: [{ product_id: "product-1", price: 0 }],
        },
        expect.any(Object),
      ),
    );
  });
});

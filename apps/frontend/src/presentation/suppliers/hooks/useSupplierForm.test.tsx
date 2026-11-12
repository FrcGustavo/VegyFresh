import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSupplierForm } from "./useSupplierForm";

const mocks = vi.hoisted(() => ({
  suppliers: new Map<string, unknown>(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
}));

vi.mock("../../../api", () => ({
  suppliersQueryOptions: {
    detail: (id: string) => ({
      queryKey: ["suppliers", "detail", id],
      queryFn: async () => mocks.suppliers.get(id),
    }),
  },
  suppliersMutationOptions: {
    create: () => ({ mutationFn: mocks.createSupplier }),
    update: () => ({ mutationFn: mocks.updateSupplier }),
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

const savedSupplier = {
  id: "supplier-1",
  folio: "PROV-001",
  name: "Frutas del Norte",
  email: null,
  phone_number: null,
  logo_url: null,
  organization_id: "org-1",
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z",
};

describe("useSupplierForm", () => {
  beforeEach(() => {
    mocks.suppliers.clear();
    mocks.createSupplier.mockReset();
    mocks.updateSupplier.mockReset();
    mocks.createSupplier.mockResolvedValue(savedSupplier);
    mocks.updateSupplier.mockImplementation(
      async ({ input }: { input: typeof savedSupplier }) => ({
        ...savedSupplier,
        ...input,
      }),
    );
  });

  it("carga un proveedor existente en modo lectura", async () => {
    mocks.suppliers.set("supplier-1", {
      ...savedSupplier,
      email: "ventas@example.com",
      phone_number: "5551234567",
    });

    const { result } = renderHook(() => useSupplierForm("supplier-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.formData).toMatchObject({
        name: "Frutas del Norte",
        email: "ventas@example.com",
        phone_number: "5551234567",
      });
      expect(result.current.isDisabled).toBe(true);
    });
  });

  it("valida el nombre antes de guardar", () => {
    const { result } = renderHook(() => useSupplierForm(), {
      wrapper: createWrapper(),
    });

    act(() => result.current.handleSubmit("save"));

    expect(result.current.formError).toBe("Completa el nombre del proveedor.");
    expect(mocks.createSupplier).not.toHaveBeenCalled();
  });

  it("normaliza el payload y conserva el proveedor creado", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSupplierForm(undefined, onSuccess), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleChange({
        target: { name: "name", value: "  Frutas del Norte  " },
      });
      result.current.handleChange({
        target: { name: "email", value: "  " },
      });
    });
    act(() => result.current.handleSubmit("save"));

    await waitFor(() => {
      expect(mocks.createSupplier).toHaveBeenCalledWith(
        {
          name: "Frutas del Norte",
          email: null,
          phone_number: null,
          logo_url: null,
        },
        expect.any(Object),
      );
      expect(onSuccess).toHaveBeenCalledWith("save", savedSupplier);
      expect(result.current.isDisabled).toBe(true);
    });
  });

  it("reinicia el formulario después de guardar y nuevo", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSupplierForm(undefined, onSuccess), {
      wrapper: createWrapper(),
    });

    act(() =>
      result.current.handleChange({
        target: { name: "name", value: "Frutas del Norte" },
      }),
    );
    act(() => result.current.handleSubmit("save-and-new"));

    await waitFor(() => {
      expect(result.current.formData.name).toBe("");
      expect(result.current.isDisabled).toBe(false);
      expect(onSuccess).toHaveBeenCalledWith("save-and-new", savedSupplier);
    });
  });

  it("muestra los errores devueltos por el API", async () => {
    mocks.createSupplier.mockRejectedValueOnce(new Error("Nombre duplicado"));
    const { result } = renderHook(() => useSupplierForm(), {
      wrapper: createWrapper(),
    });

    act(() =>
      result.current.handleChange({
        target: { name: "name", value: "Proveedor repetido" },
      }),
    );
    act(() => result.current.handleSubmit("save"));

    await waitFor(() =>
      expect(result.current.formError).toBe("Nombre duplicado"),
    );
  });
});

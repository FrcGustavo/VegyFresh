import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserForm } from "./useUserForm";

const mocks = vi.hoisted(() => ({ createUser: vi.fn() }));

vi.mock("../../../api", () => ({
  usersQueryOptions: {
    detail: (id: string) => ({
      queryKey: ["users", "detail", id],
      queryFn: async () => undefined,
    }),
  },
  rolesQueryOptions: {
    list: () => ({
      queryKey: ["roles"],
      queryFn: async () => [{ id: "role-1", name: "Admin" }],
    }),
  },
  rolesMutationOptions: { create: () => ({ mutationFn: vi.fn() }) },
  usersMutationOptions: {
    create: () => ({ mutationFn: mocks.createUser }),
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

describe("useUserForm", () => {
  beforeEach(() => {
    mocks.createUser.mockReset();
    mocks.createUser.mockResolvedValue({ id: "user-1" });
  });

  it("exige contraseña segura al crear", () => {
    const { result } = renderHook(() => useUserForm(), { wrapper: Wrapper });
    act(() => {
      result.current.handleChange({ target: { name: "name", value: "Ana" } });
      result.current.handleChange({
        target: { name: "email", value: "ana@example.com" },
      });
      result.current.handleChange({
        target: { name: "role_id", value: "role-1" },
      });
      result.current.handleChange({
        target: { name: "password", value: "corta" },
      });
    });
    act(() => result.current.handleSubmit("save"));
    expect(result.current.formError).toBe(
      "La contraseña debe tener al menos 12 caracteres.",
    );
  });

  it("crea el usuario y devuelve su ID al modal", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useUserForm(undefined, onSuccess),
      { wrapper: Wrapper },
    );
    act(() => {
      result.current.handleChange({ target: { name: "name", value: "Ana" } });
      result.current.handleChange({
        target: { name: "email", value: "ana@example.com" },
      });
      result.current.handleChange({
        target: { name: "role_id", value: "role-1" },
      });
      result.current.handleChange({
        target: { name: "password", value: "password-1234" },
      });
    });
    act(() => result.current.handleSubmit("save"));

    await waitFor(() => {
      expect(mocks.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "ana@example.com",
          password: "password-1234",
          role_id: "role-1",
        }),
        expect.any(Object),
      );
      expect(onSuccess).toHaveBeenCalledWith("save", { id: "user-1" });
    });
  });
});

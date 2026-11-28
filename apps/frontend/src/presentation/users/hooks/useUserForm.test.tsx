import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createTestRouterWrapper } from "../../../test/router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserForm } from "./useUserForm";

const { wrapper: TestRouter } = createTestRouterWrapper();

const mocks = vi.hoisted(() => ({ createUser: vi.fn() }));

vi.mock("@/infrastructure/query", () => ({
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
    <TestRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestRouter>
  );
}

describe("useUserForm", () => {
  beforeEach(() => {
    mocks.createUser.mockReset();
    mocks.createUser.mockResolvedValue({ id: "user-1" });
  });

  it("crea el usuario y devuelve su ID al modal", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUserForm(undefined, onSuccess), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.handleChange({ target: { name: "name", value: "Ana" } });
      result.current.handleChange({
        target: { name: "email", value: "ana@example.com" },
      });
      result.current.handleChange({
        target: { name: "role_id", value: "role-1" },
      });
    });
    act(() => result.current.handleSubmit("save"));

    await waitFor(() => {
      expect(mocks.createUser).toHaveBeenCalledWith(
        {
          name: "Ana",
          avatar_url: null,
          email: "ana@example.com",
          role_id: "role-1",
        },
        expect.any(Object),
      );
      expect(onSuccess).toHaveBeenCalledWith("save", { id: "user-1" });
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OrganizationPage from "./OrganizationPage";

const mocks = vi.hoisted(() => {
  const steps: string[] = [];
  return {
    steps,
    organization: null as { id: string; name: string } | null,
    navigate: vi.fn(() => { steps.push("navigate"); }),
    invalidate: vi.fn(async () => { steps.push("invalidate"); }),
    refreshSession: vi.fn(async () => { steps.push("refresh"); }),
  };
});

vi.mock("@/presentation/router/useAppNavigation", () => ({
  useAppNavigate: () => mocks.navigate,
  useAppInvalidate: () => mocks.invalidate,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useQueryClient: () => ({}),
  useMutation: (options: { mutationKey: string[] }) => ({
    isPending: false,
    mutate: (_input: unknown, callbacks: { onSuccess?: (value: unknown) => unknown }) => {
      mocks.steps.push(options.mutationKey[1]);
      void callbacks.onSuccess?.({ id: "org", name: "Nueva organización" });
    },
  }),
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({ organization: mocks.organization, refreshSession: mocks.refreshSession }),
}));
vi.mock("../../../api", () => ({
  organizationsQueryOptions: { detail: (id: string) => ({ queryKey: ["organizations", "detail", id] }) },
  organizationsMutationOptions: {
    create: () => ({ mutationKey: ["organizations", "create"] }),
    update: () => ({ mutationKey: ["organizations", "update"] }),
  },
}));

describe("OrganizationPage session changes", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_START_RUNTIME", "true");
    mocks.steps.length = 0;
    mocks.organization = null;
    mocks.navigate.mockClear();
    mocks.invalidate.mockReset().mockImplementation(async () => { mocks.steps.push("invalidate"); });
    mocks.refreshSession.mockReset().mockImplementation(async () => { mocks.steps.push("refresh"); });
  });

  it.each(["create", "update"])("refreshes route context before navigating after %s", async (action) => {
    if (action === "update") mocks.organization = { id: "org", name: "Org" };
    render(<OrganizationPage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), { target: { value: "Nueva organización" } });
    fireEvent.click(screen.getByRole("button", { name: action === "create" ? "Guardar organización" : "Guardar cambios" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/orders"));
    expect(mocks.steps).toEqual([action, "refresh", "invalidate", "navigate"]);
  });

  it.each(["refreshSession", "invalidate"] as const)("shows a %s failure without navigating", async (step) => {
    mocks[step].mockRejectedValueOnce(new Error("Sesión no disponible"));
    render(<OrganizationPage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), { target: { value: "Nueva organización" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar organización" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sesión no disponible");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

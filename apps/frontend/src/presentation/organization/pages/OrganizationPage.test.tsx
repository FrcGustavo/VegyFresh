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

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));
vi.mock("@/infrastructure/organization/useOrganizationEditor", () => ({
  useOrganizationEditor: () => ({
    detail: { data: undefined, isLoading: false, error: null },
    ...Object.fromEntries(["create", "update"].map((action) => [action, {
      isPending: false,
      mutate: (_input: unknown, callbacks: { onSuccess?: (value: unknown) => unknown }) => {
        mocks.steps.push(action);
        void callbacks.onSuccess?.({ id: "org", name: "Nueva organización" });
      },
    }])),
  }),
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({ organization: mocks.organization, refreshSession: mocks.refreshSession }),
}));

describe("OrganizationPage session changes", () => {
  beforeEach(() => {
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
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/orders" }));
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

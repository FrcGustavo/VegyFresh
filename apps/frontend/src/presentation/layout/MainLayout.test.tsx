import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/useAuth";
import MainLayout from "./MainLayout";

vi.mock("@/auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/presentation/router/useAppNavigation", async () => {
  const { useLocation, useNavigate } = await import("react-router");
  return { useAppLocation: useLocation, useAppNavigate: useNavigate };
});

const logout = vi.fn();

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/orders"]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/orders" element={<div>Orders content</div>} />
          <Route path="/products" element={<div>Products content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MainLayout", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    logout.mockReset().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      organization: { id: "org-1", name: "Org", folio: "ORG" },
      role: { id: "role-1", name: "owner", permissions: ["*"] },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      refreshSession: vi.fn(),
      logout,
    });
  });

  it("renders the active route and navigates using the sidebar", async () => {
    renderLayout();
    expect(screen.getByText("Orders content")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Usuarios y Roles")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Productos"));
    expect(await screen.findByText("Products content")).toBeInTheDocument();
  });

  it("limits navigation when there is no organization", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...vi.mocked(useAuth)(),
      organization: null,
    });
    renderLayout();
    expect(screen.getByText("Organización")).toBeInTheDocument();
    expect(screen.queryByText("Productos")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios y Roles")).not.toBeInTheDocument();
  });

  it("waits for logout before navigating to login", async () => {
    let finishLogout!: () => void;
    logout.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLogout = resolve;
      }),
    );
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.getByText("Orders content")).toBeInTheDocument();
    finishLogout();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("lets Start complete its provider logout redirect", async () => {
    vi.stubEnv("VITE_START_RUNTIME", "true");
    renderLayout();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    });
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.getByText("Orders content")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});

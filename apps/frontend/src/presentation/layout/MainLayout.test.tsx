import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/useAuth";
import MainLayout from "./MainLayout";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: "/orders" }),
}));
vi.mock("@/auth/useAuth", () => ({ useAuth: vi.fn() }));

const logout = vi.fn();
describe("MainLayout", () => {
  beforeEach(() => {
    navigate.mockReset();
    logout.mockReset().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", name: "Owner", email: "owner@example.com" },
      organization: { id: "org-1", name: "Org", folio: "ORG" },
      role: { id: "role-1", name: "owner", permissions: ["*"] },
      isAuthenticated: true, isLoading: false,
      refreshSession: vi.fn(), logout,
    });
  });
  it("renders the active route and navigates using the sidebar", () => {
    render(<MainLayout><div>Orders content</div></MainLayout>);
    expect(screen.getByText("Orders content")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Usuarios y Roles")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Productos"));
    expect(navigate).toHaveBeenCalledWith({ to: "/products" });
  });
  it("limits navigation when there is no organization", () => {
    vi.mocked(useAuth).mockReturnValue({ ...vi.mocked(useAuth)(), organization: null });
    render(<MainLayout><div>Orders content</div></MainLayout>);
    expect(screen.getByText("Organización")).toBeInTheDocument();
    expect(screen.queryByText("Productos")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios y Roles")).not.toBeInTheDocument();
  });
  it("hides privileged entries for a role without their permissions", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...vi.mocked(useAuth)(),
      role: { id: "role-2", name: "member", permissions: [] },
    });
    render(<MainLayout><div>Orders content</div></MainLayout>);
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.queryByText("Usuarios y Roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Organización")).not.toBeInTheDocument();
  });
  it("lets the session adapter complete logout without router navigation", async () => {
    let finishLogout!: () => void;
    logout.mockReturnValue(new Promise<void>((resolve) => { finishLogout = resolve; }));
    render(<MainLayout><div>Orders content</div></MainLayout>);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.getByText("Orders content")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => { finishLogout(); });
    expect(navigate).not.toHaveBeenCalled();
  });
});

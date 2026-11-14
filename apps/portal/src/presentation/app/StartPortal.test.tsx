import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { StartPortal } from "./StartPortal";

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={props.to}>{children}</a>,
  Outlet: () => <DashboardPage />,
  useRouter: () => ({ invalidate, options: { context: { queryClient: { clear: vi.fn() } } } }),
}));

const snapshot = { provider: "keycloak" as const, authenticated: true, client: { id: "a", name: "Alice", email: null, portalEnabled: true } };

describe("Start protected dashboard", () => {
  it("hydrates the request snapshot without a mismatch", async () => {
    const view = () => <StartPortal session={snapshot} />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(view());
    document.body.appendChild(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => { root = hydrateRoot(container, view()); });
    expect(container.textContent).toContain("Welcome, Alice");
    expect(errors).not.toHaveBeenCalled();
    await act(async () => root?.unmount());
    errors.mockRestore();
    container.remove();
  });

  it("retries an unavailable session without displaying the protected page", () => {
    render(<StartPortal session={{ provider: "keycloak", authenticated: null }} />);
    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(invalidate).toHaveBeenCalled();
  });
});

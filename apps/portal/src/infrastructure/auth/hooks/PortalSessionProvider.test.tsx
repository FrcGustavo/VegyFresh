import { act, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PortalSessionSnapshot } from "../../../domain/auth/auth.types";
import type { PortalSessionAdapter } from "../browserSession";
import { PortalSessionProvider } from "./PortalSessionProvider";
import { usePortalSession } from "./usePortalSession";

const client = { id: "1", name: "Alice", email: null, portalEnabled: true };
const snapshot: PortalSessionSnapshot = { provider: "keycloak", authenticated: true, client };
function adapter(): PortalSessionAdapter {
  return { load: vi.fn().mockResolvedValue(null), login: vi.fn().mockResolvedValue(client), setupPassword: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) };
}
function View() {
  const session = usePortalSession();
  return <button onClick={() => void session.logout()}>{session.isLoading ? "loading" : session.client?.name ?? "guest"}</button>;
}

describe("PortalSessionProvider", () => {
  it("hydrates the public snapshot without loading browser session data", async () => {
    const sessionAdapter = adapter();
    const tree = <PortalSessionProvider initialSession={snapshot} adapter={sessionAdapter}><View /></PortalSessionProvider>;
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);
    const recoverableError = vi.fn();
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, tree, { onRecoverableError: recoverableError }); });
    expect(container.textContent).toBe("Alice");
    expect(sessionAdapter.load).not.toHaveBeenCalled();
    expect(recoverableError).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
    container.remove();
  });

  it("keeps provider state isolated and loads the legacy SPA adapter", async () => {
    const a = adapter();
    const b = adapter();
    render(<><PortalSessionProvider initialSession={snapshot} adapter={a}><View /></PortalSessionProvider><PortalSessionProvider adapter={b}><View /></PortalSessionProvider></>);
    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
    expect(b.load).toHaveBeenCalledOnce();
    await act(async () => { screen.getByText("Alice").click(); });
    expect(screen.getAllByText("guest")).toHaveLength(2);
    expect(a.logout).toHaveBeenCalledOnce();
    expect(b.logout).not.toHaveBeenCalled();
  });
});

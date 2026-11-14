import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalSessionProvider } from "./PortalSessionProvider";
import { usePortalSession } from "./usePortalSession";

function View() {
  const session = usePortalSession();
  return <span>{session.isLoading ? "loading" : session.client?.name ?? "guest"}</span>;
}

describe("PortalSessionProvider", () => {
  it("hydrates the public request snapshot without a mismatch", async () => {
    const snapshot = { provider: "keycloak" as const, authenticated: true, client: { id: "1", name: "Alice", email: null, portalEnabled: true } };
    const tree = <PortalSessionProvider initialSession={snapshot}><View /></PortalSessionProvider>;
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);
    const recoverableError = vi.fn();
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, tree, { onRecoverableError: recoverableError }); });
    expect(container.textContent).toBe("Alice");
    expect(recoverableError).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
    container.remove();
  });
});

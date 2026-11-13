import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "./queryClient";
import { StartSignIn } from "./StartSignIn";

vi.mock("../../session.functions", () => ({ getPublicSession: vi.fn() }));

describe("Start guest page", () => {
  it("hydrates the public server snapshot without rereading the session", async () => {
    const { getPublicSession } = await import("../../session.functions");
    const session = { provider: "keycloak" as const, authenticated: true, client: { id: "a", name: "Alice", email: null, portalEnabled: true } };
    const view = () => <QueryClientProvider client={createQueryClient()}><StartSignIn initialSession={session} /></QueryClientProvider>;
    const html = renderToString(view());
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => { root = hydrateRoot(container, view()); });
    expect(container.textContent).toContain("Signed in as Alice");
    expect(getPublicSession).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    await act(async () => root?.unmount());
    errors.mockRestore();
    container.remove();
  });

  it("renders an actionable unavailable state instead of a guest login", () => {
    const html = renderToString(<QueryClientProvider client={createQueryClient()}><StartSignIn initialSession={{ provider: "keycloak", authenticated: null }} /></QueryClientProvider>);
    expect(html).toContain("Retry");
    expect(html).not.toContain("/session/login");
  });
});

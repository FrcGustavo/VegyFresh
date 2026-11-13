import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./providers";
import { usePortalSession } from "../../infrastructure/auth/hooks/usePortalSession";

describe("AppProviders", () => {
  it("keeps query data isolated between provider instances and stable on rerender", () => {
    const clients: QueryClient[] = [];
    function CaptureClient() {
      clients.push(useQueryClient());
      return null;
    }

    const first = render(<AppProviders><CaptureClient /></AppProviders>);
    const firstClient = clients[0];
    firstClient.setQueryData(["private"], "first session");

    first.rerender(<AppProviders><CaptureClient /></AppProviders>);
    expect(clients[clients.length - 1]).toBe(firstClient);

    render(<AppProviders><CaptureClient /></AppProviders>);
    const secondClient = clients[clients.length - 1];
    expect(secondClient).not.toBe(firstClient);
    expect(secondClient.getQueryData(["private"])).toBeUndefined();
  });
});

it("clears the provider query cache when its session changes", async () => {
  let queryClient: QueryClient;
  function Session() {
    queryClient = useQueryClient();
    const session = usePortalSession();
    return <button onClick={() => void session.logout()}>Log out</button>;
  }
  const adapter = {
    load: async () => null,
    login: async () => { throw new Error("unused"); },
    setupPassword: async () => { throw new Error("unused"); },
    logout: async () => {},
  };
  render(<AppProviders initialSession={{ provider: "keycloak", authenticated: false }} sessionAdapter={adapter}><Session /></AppProviders>);
  queryClient!.setQueryData(["private"], "old identity");
  await act(async () => { screen.getByText("Log out").click(); });
  expect(queryClient!.getQueryData(["private"])).toBeUndefined();
});

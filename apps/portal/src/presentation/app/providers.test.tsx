import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./providers";

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

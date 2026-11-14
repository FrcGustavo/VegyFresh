// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { authStorage } from "@/infrastructure/auth/authStorage";
import * as infrastructureApi from "./index";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("API infrastructure boundary", () => {
  it("refreshes the active browser session and retries a resource request", async () => {
    authStorage.setTokens("expired", "refresh-old");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "fresh",
            refresh_token: "refresh-new",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(infrastructureApi.clientsApi.getAll()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${infrastructureApi.API_URL}/auth/refresh`,
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      refresh_token: "refresh-old",
    });
    expect(
      new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization"),
    ).toBe("Bearer expired");
    expect(
      new Headers(fetchMock.mock.calls[2][1].headers).get("Authorization"),
    ).toBe("Bearer fresh");
    expect(authStorage.getRefreshToken()).toBe("refresh-new");
  });
});

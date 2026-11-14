import { beforeEach, describe, expect, it, vi } from "vitest";
import { browserSession } from "./browserSession";
import { authApi } from "./authApi";
import { getAccessToken, getRefreshToken, setTokens } from "../api/httpClient";

vi.mock("./authApi", () => ({ authApi: { me: vi.fn(), refresh: vi.fn(), login: vi.fn(), setupPassword: vi.fn(), logout: vi.fn() } }));
const client = { id: "1", name: "Alice", email: null, portalEnabled: true };

describe("legacy browser session adapter", () => {
  beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });

  it("restores an existing access token and clears invalid tokens", async () => {
    setTokens("old-access", "old-refresh");
    vi.mocked(authApi.me).mockResolvedValueOnce(client).mockRejectedValueOnce(new Error("expired"));
    expect(await browserSession.load()).toEqual(client);
    expect(await browserSession.load()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("refreshes and persists a session when only the refresh token exists", async () => {
    localStorage.setItem("portal-refresh-token", "old-refresh");
    vi.mocked(authApi.refresh).mockResolvedValue({ client, access_token: "new-access", refresh_token: "new-refresh" });
    expect(await browserSession.load()).toEqual(client);
    expect(getAccessToken()).toBe("new-access");
    expect(getRefreshToken()).toBe("new-refresh");
  });

  it("persists credentials after legacy login", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ client, access_token: "access", refresh_token: "refresh" });
    expect(await browserSession.login({ email: "a@example.com", password: "password" })).toEqual(client);
    expect(getAccessToken()).toBe("access");
    expect(getRefreshToken()).toBe("refresh");
  });
});

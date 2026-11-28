import { afterEach, describe, expect, it, vi } from "vitest";
import { logoutSession } from "./sessionActions";

afterEach(() => vi.unstubAllGlobals());

describe("logoutSession", () => {
  it.each(["/session/logout/redirect", "/"])("navigates to the allowed %s response", async (redirectTo) => {
    const assign = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ redirectTo }) }));
    vi.stubGlobal("window", { location: { assign } });

    await logoutSession();

    expect(assign).toHaveBeenCalledWith(redirectTo);
  });

  it.each(["https://attacker.example", "//attacker.example", "/other"])("rejects the unsafe %s response", async (redirectTo) => {
    const assign = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ redirectTo }) }));
    vi.stubGlobal("window", { location: { assign } });

    await expect(logoutSession()).rejects.toThrow("Logout failed");
    expect(assign).not.toHaveBeenCalled();
  });
});

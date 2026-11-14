import { describe, expect, it } from "vitest";
import { buildAuthStartHref } from "./authRedirect";

describe("destinos del flujo OIDC", () => {
  it("redirige al inicio de sesión con un returnTo interno", () => {
    expect(
      buildAuthStartHref("login", "?returnTo=%2Forders%3Ftab%3Dopen"),
    ).toBe("/session/login?returnTo=%2Forders%3Ftab%3Dopen");
  });

  it("redirige al registro sin mostrar un formulario local", () => {
    expect(buildAuthStartHref("register", "")).toBe("/session/register");
  });

  it.each([
    "https://example.invalid/",
    "//example.invalid/",
    "/api/v1/users",
    "/%2f%2fevil.invalid",
    "/\\\\evil.invalid",
  ])("descarta un returnTo inseguro: %s", (returnTo) => {
    expect(
      buildAuthStartHref(
        "login",
        `?returnTo=${encodeURIComponent(returnTo)}`,
      ),
    ).toBe("/session/login");
  });
});

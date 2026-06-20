import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "./apiEnvironment";

describe("configuración del API", () => {
  it("prioriza la URL configurada en runtime", () => {
    expect(
      resolveApiUrl(
        "https://api.staging.example.com/api/v1/",
        "https://api.dev.example.com/api/v1",
      ),
    ).toBe("https://api.staging.example.com/api/v1");
  });

  it("usa VITE_API_URL cuando no existe configuración runtime", () => {
    expect(
      resolveApiUrl(undefined, "https://api.dev.example.com/api/v1/"),
    ).toBe("https://api.dev.example.com/api/v1");
  });

  it("usa el backend local con el prefijo del API como fallback", () => {
    expect(resolveApiUrl()).toBe("http://localhost:3000/api/v1");
  });
});

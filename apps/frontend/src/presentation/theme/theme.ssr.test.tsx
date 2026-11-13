// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemePreferenceProvider } from "@/infrastructure/preferences/ThemePreferenceProvider";
import {
  createThemePreferenceStore,
  useThemePreferenceStore,
} from "@/infrastructure/preferences/useThemePreferenceStore";
import { useAppTheme } from "./useAppTheme";

function ThemeView() {
  const { theme, themePreference } = useAppTheme();
  const preference = useThemePreferenceStore((state) => state.themePreference);
  return (
    <span>
      {preference}:{themePreference}:{theme.palette.mode}
    </span>
  );
}

describe("server theme composition", () => {
  it("renders the default without browser globals for independent requests", () => {
    expect(typeof window).toBe("undefined");
    const renderRequest = () =>
      renderToString(
        <ThemePreferenceProvider>
          <ThemeView />
        </ThemePreferenceProvider>,
      );
    expect(renderRequest()).toBe(
      "<span>system<!-- -->:<!-- -->system<!-- -->:<!-- -->light</span>",
    );
    expect(renderRequest()).toBe(renderRequest());
  });

  it("does not share changes between request stores", () => {
    const first = createThemePreferenceStore();
    const second = createThemePreferenceStore();
    first.getState().setThemePreference("dark");
    expect(first.getState().themePreference).toBe("dark");
    expect(second.getState().themePreference).toBe("system");
    second.hydrate();
    expect(second.getState().themePreference).toBe("system");
  });
});

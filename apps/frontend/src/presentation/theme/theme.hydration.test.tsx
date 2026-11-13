import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemePreferenceProvider } from "@/infrastructure/preferences/ThemePreferenceProvider";
import { useThemePreferenceStore } from "@/infrastructure/preferences/useThemePreferenceStore";
import { useAppTheme } from "./useAppTheme";

const key = "vegyfresh-theme-preference";
function ThemeView() {
  const { theme, themePreference, setThemePreference } = useAppTheme();
  return (
    <>
      <output>
        {themePreference}:{theme.palette.mode}
      </output>
      <button onClick={() => setThemePreference("light")}>Light</button>
      <button onClick={() => setThemePreference("dark")}>Dark</button>
      <button onClick={() => setThemePreference("system")}>System</button>
    </>
  );
}
const app = (
  <StrictMode>
    <ThemePreferenceProvider>
      <ThemeView />
    </ThemePreferenceProvider>
  </StrictMode>
);
let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(async () => {
  if (root) await act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("client theme hydration", () => {
  it("matches server markup before restoring an existing preference", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({ state: { themePreference: "dark" }, version: 0 }),
    );
    const markup = renderToString(app);
    expect(markup).toContain("system<!-- -->:<!-- -->light");
    container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const recoverableError = vi.fn();
    await act(() => {
      root = hydrateRoot(container!, app, {
        onRecoverableError: recoverableError,
      });
    });
    expect(recoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("output")).toHaveTextContent("dark:dark");
    fireEvent.click(screen.getByText("Light"));
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      state: { themePreference: "light" },
      version: 0,
    });
    await act(() => root?.unmount());
    root = undefined;
    render(app);
    expect(await screen.findByText("light:light")).toBeInTheDocument();
  });

  it("uses system preference after hydration and follows changes", async () => {
    let onChange: (() => void) | undefined;
    const media = {
      matches: true,
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        onChange = listener;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => media),
    );
    render(app);
    expect(await screen.findByText("system:dark")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Light"));
    expect(screen.getByText("light:light")).toBeInTheDocument();
    fireEvent.click(screen.getByText("System"));
    expect(screen.getByText("system:dark")).toBeInTheDocument();
    media.matches = false;
    await act(() => onChange?.());
    expect(screen.getByText("system:light")).toBeInTheDocument();
  });

  it.each([
    "not-json",
    JSON.stringify({ state: { themePreference: "blue" }, version: 0 }),
  ])("ignores invalid stored data: %s", async (value) => {
    localStorage.setItem(key, value);
    render(app);
    expect(await screen.findByText("system:dark")).toBeInTheDocument();
  });

  it("keeps in-memory settings when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(app);
    fireEvent.click(screen.getByText("Light"));
    expect(screen.getByText("light:light")).toBeInTheDocument();
  });

  it("isolates two provider trees", async () => {
    function Choice({ label }: { label: string }) {
      const preference = useThemePreferenceStore(
        (state) => state.themePreference,
      );
      const set = useThemePreferenceStore((state) => state.setThemePreference);
      return (
        <button onClick={() => set("dark")}>
          {label}:{preference}
        </button>
      );
    }
    render(
      <>
        <ThemePreferenceProvider>
          <Choice label="first" />
        </ThemePreferenceProvider>
        <ThemePreferenceProvider>
          <Choice label="second" />
        </ThemePreferenceProvider>
      </>,
    );
    fireEvent.click(screen.getByText("first:system"));
    await waitFor(() =>
      expect(screen.getByText("first:dark")).toBeInTheDocument(),
    );
    expect(screen.getByText("second:system")).toBeInTheDocument();
  });
});

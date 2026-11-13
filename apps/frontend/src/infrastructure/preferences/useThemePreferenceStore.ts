import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "vegyfresh-theme-preference";

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

interface ThemePreferenceState {
  themePreference: ThemePreference;
  setThemePreference: (themePreference: ThemePreference) => void;
}

export interface ThemePreferenceStore extends StoreApi<ThemePreferenceState> {
  hydrate: () => void;
}

// The persisted shape remains compatible with the previous Zustand persist store.
const readPreference = (): ThemePreference | undefined => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw === null ? undefined : JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("state" in value))
      return;
    const state = value.state;
    if (
      typeof state !== "object" ||
      state === null ||
      !("themePreference" in state)
    )
      return;
    return isThemePreference(state.themePreference)
      ? state.themePreference
      : undefined;
  } catch {
    return;
  }
};

const writePreference = (themePreference: ThemePreference) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { themePreference }, version: 0 }),
    );
  } catch {
    // Storage may be unavailable or full; the in-memory choice still works.
  }
};

export const createThemePreferenceStore = (): ThemePreferenceStore => {
  let hydrated = false;
  let changedBeforeHydration = false;
  const store = createStore<ThemePreferenceState>()((set) => ({
    themePreference: "system",
    setThemePreference: (themePreference) => {
      if (!hydrated) changedBeforeHydration = true;
      set({ themePreference });
      writePreference(themePreference);
    },
  }));

  return Object.assign(store, {
    hydrate: () => {
      if (hydrated) return;
      hydrated = true;
      if (changedBeforeHydration) return;
      const saved = readPreference();
      if (saved) store.setState({ themePreference: saved });
    },
  });
};

export const ThemePreferenceContext =
  createContext<ThemePreferenceStore | null>(null);

export function useThemePreferenceStore<T>(
  selector: (state: ThemePreferenceState) => T,
): T {
  const store = useContext(ThemePreferenceContext);
  if (!store) throw new Error("ThemePreferenceProvider is missing");
  return useStore(store, selector);
}

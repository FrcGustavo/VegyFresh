import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

const THEME_PREFERENCE_STORAGE_KEY = "vegyfresh-theme-preference";

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

interface ThemePreferenceStore {
  themePreference: ThemePreference;
  setThemePreference: (themePreference: ThemePreference) => void;
}

export const useThemePreferenceStore = create<ThemePreferenceStore>()(
  persist(
    (set) => ({
      themePreference: "system",
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    {
      name: THEME_PREFERENCE_STORAGE_KEY,
      merge: (persisted, current) => {
        const persistedThemePreference = (
          persisted as Partial<ThemePreferenceStore>
        )?.themePreference;

        return {
          ...current,
          themePreference: isThemePreference(persistedThemePreference)
            ? persistedThemePreference
            : current.themePreference,
        };
      },
    },
  ),
);

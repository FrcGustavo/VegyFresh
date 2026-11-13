import { useEffect, useState, type ReactNode } from "react";
import {
  createThemePreferenceStore,
  ThemePreferenceContext,
} from "./useThemePreferenceStore";

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createThemePreferenceStore);

  useEffect(() => {
    store.hydrate();
  }, [store]);

  return (
    <ThemePreferenceContext.Provider value={store}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

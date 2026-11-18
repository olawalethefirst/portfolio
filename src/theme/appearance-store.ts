import { createStore } from "zustand/vanilla";
import { MODE_COOKIE, THEME_COOKIE, type AppearanceChoice } from "./appearance";
import type { ThemeMode, ThemeName } from "./theme";

export interface AppearanceState extends AppearanceChoice {
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
}

function remember(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * One store per request/page, seeded with the choices the server read from the
 * cookies. The cookie is both the storage and what the server reads, so setters
 * write it directly rather than going through a persistence layer.
 */
export function createAppearanceStore(initial: AppearanceChoice = {}) {
  return createStore<AppearanceState>()((set) => ({
    ...initial,
    setTheme: (theme) => {
      remember(THEME_COOKIE, theme);
      set({ theme });
    },
    setMode: (mode) => {
      remember(MODE_COOKIE, mode);
      set({ mode });
    },
  }));
}

import { createStore } from "zustand/vanilla";
import { MODE_COOKIE, THEME_COOKIE, type AppearanceChoice } from "./appearance";
import type { ThemeMode, ThemeName } from "./theme";

export interface AppearanceState extends AppearanceChoice {
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
}

/** Persist the choice and apply it to <html>, where the CSS and scene read it. */
function apply(attribute: "theme" | "mode", cookie: string, value: string) {
  document.cookie = `${cookie}=${value}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset[attribute] = value;
}

/**
 * One store per request/page, seeded with the choices the server read from the
 * cookies. The cookie is both the storage and what the server reads, so setters
 * write it (and the <html> attribute) directly rather than going through a
 * persistence layer.
 */
export function createAppearanceStore(initial: AppearanceChoice = {}) {
  return createStore<AppearanceState>()((set) => ({
    ...initial,
    setTheme: (theme) => {
      apply("theme", THEME_COOKIE, theme);
      set({ theme });
    },
    setMode: (mode) => {
      apply("mode", MODE_COOKIE, mode);
      set({ mode });
    },
  }));
}

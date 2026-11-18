import { isThemeMode, isThemeName, type ThemeMode, type ThemeName } from "./theme";

/** Cookies holding the visitor's explicit choices; absent means "no choice". */
export const THEME_COOKIE = "portfolio-theme";
export const MODE_COOKIE = "portfolio-mode";

export interface AppearanceChoice {
  theme?: ThemeName;
  mode?: ThemeMode;
}

/**
 * Explicit choices from any cookie reader (`cookies().get(name)?.value` on the
 * server, a `document.cookie` lookup in the browser). Unknown values are ignored.
 */
export function parseAppearance(
  read: (name: string) => string | undefined,
): AppearanceChoice {
  const theme = read(THEME_COOKIE);
  const mode = read(MODE_COOKIE);
  return {
    theme: isThemeName(theme) ? theme : undefined,
    mode: isThemeMode(mode) ? mode : undefined,
  };
}

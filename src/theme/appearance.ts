import {
  isThemeMode,
  isThemeName,
  type ThemeMode,
  type ThemeName,
} from "./theme";

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

/**
 * Runs in <head> before first paint. With no valid saved mode it follows the
 * device: the server renders the dark default, so only a light-scheme device
 * needs correcting. Saved choices are rendered by the server, not this script.
 */
export const MODE_INIT_SCRIPT = `(
  function() {
    try {
      var m = document.cookie.match(/(?:^|; )${MODE_COOKIE}=(light|dark)(?:;|$)/);
      if (!m && matchMedia("(prefers-color-scheme: light)").matches)
        document.documentElement.dataset.mode = "light";
    } catch (e) {}
  }
)()`;

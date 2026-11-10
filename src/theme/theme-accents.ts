"use client";

import { useSyncExternalStore } from "react";
import { cssColorToHex } from "./browser-color";

import { themes, type ThemeName } from "./theme";

export { themes } from "./theme";
export type { ThemeName } from "./theme";

export type ThemeAccents = Record<ThemeName, string>;

/**
 * Reads every theme's accent colour from the live stylesheet as hex.
 *
 * `src/styles/design-tokens.css` is the single source of truth for the palette,
 * so the values are read rather than mirrored here. The accents are declared on
 * `:root` as `--accent-<theme>` precisely so all four are readable at once; a
 * value declared only inside a `[data-theme][data-mode]` block would be
 * unreadable unless that theme were active.
 *
 * Requires a document, so it cannot run during server render.
 */
export function readThemeAccents(): ThemeAccents {
  const root = getComputedStyle(document.documentElement);

  return Object.fromEntries(
    themes.map((theme) => [
      theme,
      cssColorToHex(root.getPropertyValue(`--accent-${theme}`)),
    ]),
  ) as ThemeAccents;
}

let accents: ThemeAccents | undefined;

const readOnce = () => (accents ??= readThemeAccents());
const readOnServer = () => null;
const neverChanges = () => () => {};

/**
 * Returns the accents on the client, and `null` during server render.
 *
 * The page is prerendered, so the values cannot exist in the first pass and
 * callers render a placeholder for it. `useSyncExternalStore` is what supplies
 * the distinct server snapshot, which keeps the hydrated markup matching what
 * the server sent. The result is memoised because it never changes and because
 * the snapshot is compared by identity.
 */
export function useThemeAccents(): ThemeAccents | null {
  return useSyncExternalStore(neverChanges, readOnce, readOnServer);
}

/** Maps a hex colour produced by `readThemeAccents` back to its theme. */
export function themeForAccent(
  accents: ThemeAccents,
  hex: string,
): ThemeName | undefined {
  const match = hex.toLowerCase();

  return themes.find((theme) => accents[theme].toLowerCase() === match);
}

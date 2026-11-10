export const themes = ["chartreuse", "copper", "plum", "forest"] as const;
export type ThemeName = (typeof themes)[number];
export type ThemeMode = "light" | "dark";

export interface ActiveTheme {
  readonly theme: ThemeName;
  readonly mode: ThemeMode;
}

export const DEFAULT_THEME: ActiveTheme = Object.freeze({
  theme: "chartreuse",
  mode: "light",
});

export function isThemeName(value: unknown): value is ThemeName {
  return themes.some((theme) => theme === value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

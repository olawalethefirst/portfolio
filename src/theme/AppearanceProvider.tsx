"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MODE_COOKIE, THEME_COOKIE, type AppearanceChoice } from "./appearance";
import {
  DEFAULT_THEME,
  type ActiveTheme,
  type ThemeMode,
  type ThemeName,
} from "./theme";

export interface Appearance extends ActiveTheme {
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
}

/** Used outside a provider (isolated renders): the defaults, read-only. */
const readOnly: Appearance = {
  ...DEFAULT_THEME,
  setTheme: () => {},
  setMode: () => {},
};

const AppearanceContext = createContext<Appearance>(readOnly);

/** Persist the choice and apply it to <html>, where the CSS and scene read it. */
function apply(attribute: "theme" | "mode", cookie: string, value: string) {
  document.cookie = `${cookie}=${value}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset[attribute] = value;
}

/**
 * Holds the visitor's explicit choices, seeded with what the server read from
 * the cookies so server and client agree. Setters write the cookie and the
 * <html> attribute; state holds only explicit choices, the rest falls back to
 * the defaults.
 */
export function AppearanceProvider({
  initial = {},
  children,
}: {
  initial?: AppearanceChoice;
  children: ReactNode;
}) {
  const [choice, setChoice] = useState(initial);
  const setTheme = useCallback((theme: ThemeName) => {
    apply("theme", THEME_COOKIE, theme);
    setChoice((current) => ({ ...current, theme }));
  }, []);
  const setMode = useCallback((mode: ThemeMode) => {
    apply("mode", MODE_COOKIE, mode);
    setChoice((current) => ({ ...current, mode }));
  }, []);
  const value = useMemo(
    () => ({
      theme: choice.theme ?? DEFAULT_THEME.theme,
      mode: choice.mode ?? DEFAULT_THEME.mode,
      setTheme,
      setMode,
    }),
    [choice, setTheme, setMode],
  );
  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

/** The applied theme and mode, with their setters. */
export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}

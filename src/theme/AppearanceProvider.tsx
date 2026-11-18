"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
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

function remember(cookie: string, value: string) {
  document.cookie = `${cookie}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Holds the visitor's explicit choices, seeded with what the server read from
 * the cookies so server and client agree. With no explicit mode the applied
 * mode follows the device (the head script covers first paint; this keeps it
 * following changes). The applied values are written to <html>, where the CSS
 * and the Prism scene read them.
 */
export function AppearanceProvider({
  initial = {},
  children,
}: {
  initial?: AppearanceChoice;
  children: ReactNode;
}) {
  const [choice, setChoice] = useState(initial);
  const [device, setDevice] = useState<ThemeMode>();

  useLayoutEffect(() => {
    if (choice.mode || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const follow = () => setDevice(query.matches ? "light" : "dark");
    follow();
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [choice.mode]);

  const theme = choice.theme ?? DEFAULT_THEME.theme;
  const mode = choice.mode ?? device ?? DEFAULT_THEME.mode;

  // Re-applied on every change and remount, which also covers Strict Mode's
  // development remount clearing attributes the head script set.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  const setTheme = useCallback((next: ThemeName) => {
    remember(THEME_COOKIE, next);
    setChoice((current) => ({ ...current, theme: next }));
  }, []);
  const setMode = useCallback((next: ThemeMode) => {
    remember(MODE_COOKIE, next);
    setChoice((current) => ({ ...current, mode: next }));
  }, []);
  const value = useMemo(
    () => ({ theme, mode, setTheme, setMode }),
    [theme, mode, setTheme, setMode],
  );
  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

/** The applied theme and mode, with their setters. */
export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}

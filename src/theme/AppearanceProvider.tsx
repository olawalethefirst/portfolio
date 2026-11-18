"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { AppearanceChoice } from "./appearance";
import {
  createAppearanceStore,
  type AppearanceState,
} from "./appearance-store";
import { DEFAULT_THEME, type ActiveTheme } from "./theme";

type AppearanceStore = ReturnType<typeof createAppearanceStore>;

/**
 * Used when no provider is mounted. It is only ever written by browser events,
 * so server renders always see the defaults; a provider (seeded from the
 * request cookies) supersedes it.
 */
export const defaultAppearanceStore = createAppearanceStore();

const AppearanceContext = createContext<AppearanceStore>(
  defaultAppearanceStore,
);

/** Seed with the choices the server read from the cookies. */
export function AppearanceProvider({
  initial,
  children,
}: {
  initial?: AppearanceChoice;
  children: ReactNode;
}) {
  const [store] = useState(() => createAppearanceStore(initial));
  return <AppearanceContext value={store}>{children}</AppearanceContext>;
}

export function useAppearance<T>(selector: (state: AppearanceState) => T): T {
  return useStore(useContext(AppearanceContext), selector);
}

/** The applied theme and mode: the visitor's choice, else the defaults. */
export function useActiveTheme(): ActiveTheme {
  const theme = useAppearance((state) => state.theme);
  const mode = useAppearance((state) => state.mode);
  return {
    theme: theme ?? DEFAULT_THEME.theme,
    mode: mode ?? DEFAULT_THEME.mode,
  };
}

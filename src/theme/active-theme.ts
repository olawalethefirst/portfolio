"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_THEME,
  isThemeMode,
  isThemeName,
  type ActiveTheme,
  type ThemeMode,
  type ThemeName,
} from "./theme";

let snapshot: ActiveTheme = DEFAULT_THEME;
let observer: MutationObserver | undefined;
const listeners = new Set<() => void>();

function readSnapshot(): ActiveTheme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const { theme: rawTheme, mode: rawMode } = document.documentElement.dataset;
  const theme = isThemeName(rawTheme) ? rawTheme : DEFAULT_THEME.theme;
  const mode = isThemeMode(rawMode) ? rawMode : DEFAULT_THEME.mode;
  if (snapshot.theme !== theme || snapshot.mode !== mode) {
    snapshot = Object.freeze({ theme, mode });
  }
  return snapshot;
}

function notifyChange() {
  readSnapshot();
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (!observer) {
    observer = new MutationObserver(notifyChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode"],
    });
  }
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

const readServerSnapshot = () => DEFAULT_THEME;

export function useActiveTheme(): ActiveTheme {
  return useSyncExternalStore(subscribe, readSnapshot, readServerSnapshot);
}

export function setGlobalTheme(theme: ThemeName) {
  if (!isThemeName(theme)) throw new TypeError("Invalid theme name.");
  document.documentElement.dataset.theme = theme;
  notifyChange();
}

export function setGlobalMode(mode: ThemeMode) {
  if (!isThemeMode(mode)) throw new TypeError("Invalid theme mode.");
  document.documentElement.dataset.mode = mode;
  notifyChange();
}

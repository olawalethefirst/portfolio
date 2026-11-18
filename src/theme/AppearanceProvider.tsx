"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { AppearanceChoice } from "./appearance";
import { createAppearanceStore, type AppearanceState } from "./appearance-store";

type AppearanceStore = ReturnType<typeof createAppearanceStore>;

const AppearanceContext = createContext<AppearanceStore | null>(null);

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
  const store = useContext(AppearanceContext);
  if (!store) throw new Error("useAppearance needs an AppearanceProvider.");
  return useStore(store, selector);
}

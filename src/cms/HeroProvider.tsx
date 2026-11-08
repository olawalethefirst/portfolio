"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialHero, type HeroDraft } from "./hero";
const HeroContext = createContext<{ saved: HeroDraft; save: (value: HeroDraft) => Promise<void>; pending: boolean; working: DraftStore<HeroDraft> } | null>(null);
async function demoRequest() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}
export function HeroProvider({ children, request = demoRequest }: { children: ReactNode; request?: () => Promise<void> }) {
  const working = useDraftStore<HeroDraft>();
  const [saved, setSaved] = useState(initialHero);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  async function save(next: HeroDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    const submitted = structuredClone(next);
    saving.current = true;
    setPending(true);
    try {
      await request();
      setSaved(submitted);
    } finally { saving.current = false; setPending(false); }
  }
  return <HeroContext value={{ working, saved, save, pending }}>{children}</HeroContext>;
}
export function useHero() {
  const context = useContext(HeroContext);
  if (!context) throw new Error("Hero editor requires HeroProvider.");
  return context;
}

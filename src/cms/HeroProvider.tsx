"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialHero, type HeroDraft } from "./hero";
const HeroContext = createContext<{ value: HeroDraft; saved: HeroDraft; save: (value: HeroDraft) => Promise<void>; pending: boolean } | null>(null);
async function demoRequest() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}
export function HeroProvider({ children, request = demoRequest }: { children: ReactNode; request?: () => Promise<void> }) {
  const [value, setValue] = useState(initialHero);
  const [saved, setSaved] = useState(initialHero);
  const [pending, setPending] = useState(false);
  async function save(next: HeroDraft) {
    if (pending) throw new Error("A save is already in progress.");
    setPending(true);
    try {
      await request();
      const copy = structuredClone(next);
      setValue(copy);
      setSaved(copy);
    } finally { setPending(false); }
  }
  return <HeroContext value={{ value, saved, save, pending }}>{children}</HeroContext>;
}
export function useHero() {
  const context = useContext(HeroContext);
  if (!context) throw new Error("Hero editor requires HeroProvider.");
  return context;
}

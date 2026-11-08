"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialHero, type HeroDraft } from "./hero";
const HeroContext = createContext<{ value: HeroDraft; saved: HeroDraft; save: (value: HeroDraft) => Promise<void>; pending: boolean; failNext: boolean; setFailNext: (value: boolean) => void } | null>(null);
export function HeroProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState(initialHero);
  const [saved, setSaved] = useState(initialHero);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  async function save(next: HeroDraft) {
    if (pending) throw new Error("A save is already in progress.");
    setPending(true);
    const fail = failNext;
    setFailNext(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (fail) throw new Error("The demo save failed. Your changes are still here.");
      const copy = structuredClone(next);
      setValue(copy);
      setSaved(copy);
    } finally { setPending(false); }
  }
  return <HeroContext value={{ value, saved, save, pending, failNext, setFailNext }}>{children}</HeroContext>;
}
export function useHero() {
  const context = useContext(HeroContext);
  if (!context) throw new Error("Hero editor requires HeroProvider.");
  return context;
}

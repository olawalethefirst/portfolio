"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialAbout, type AboutDraft } from "./about";

type AboutRequest = (fail: boolean) => Promise<void>;
async function demoRequest(fail: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (fail) throw new Error("The demo save failed. Your changes are still here.");
}
const AboutContext = createContext<{
  saved: AboutDraft;
  save: (value: AboutDraft) => Promise<void>;
  pending: boolean;
  failNext: boolean;
  setFailNext: (value: boolean) => void;
} | null>(null);

export function AboutProvider({ children, request = demoRequest }: { children: ReactNode; request?: AboutRequest }) {
  const [saved, setSaved] = useState(initialAbout);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const saving = useRef(false);
  async function save(value: AboutDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    saving.current = true;
    const submitted = { ...value };
    const fail = failNext;
    setPending(true);
    setFailNext(false);
    try {
      await request(fail);
      setSaved(submitted);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  return <AboutContext value={{ saved, save, pending, failNext, setFailNext }}>{children}</AboutContext>;
}

export function useAbout() {
  const context = useContext(AboutContext);
  if (!context) throw new Error("About editor requires AboutProvider.");
  return context;
}

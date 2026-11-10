"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { aboutDraftSchema, aboutSchema, initialAbout, type AboutDraft } from "./about";

type AboutRequest = () => Promise<void>;
async function demoRequest() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}
const AboutContext = createContext<{
  saved: AboutDraft;
  save: (value: AboutDraft) => Promise<void>;
  pending: boolean;
  working: DraftStore<AboutDraft>;
} | null>(null);

export function AboutProvider({ children, request = demoRequest }: { children: ReactNode; request?: AboutRequest }) {
  const working = useDraftStore<AboutDraft>({ namespace: "about", schema: aboutDraftSchema });
  const [saved, setSaved] = useState(initialAbout);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  async function save(value: AboutDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    const submitted = aboutSchema.parse({ ...value });
    saving.current = true;
    setPending(true);
    try {
      await request();
      setSaved(submitted);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  return <AboutContext value={{ working, saved, save, pending }}>{children}</AboutContext>;
}

export function useAbout() {
  const context = useContext(AboutContext);
  if (!context) throw new Error("About editor requires AboutProvider.");
  return context;
}

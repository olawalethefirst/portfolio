"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialSocial, type SocialDraft } from "./social";

type SocialRequest = () => Promise<void>;
async function demoRequest() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}
const SocialContext = createContext<{
  saved: SocialDraft;
  save: (value: SocialDraft) => Promise<void>;
  pending: boolean;
} | null>(null);

export function SocialProvider({ children, request = demoRequest }: { children: ReactNode; request?: SocialRequest }) {
  const [saved, setSaved] = useState(initialSocial);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  async function save(value: SocialDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    saving.current = true;
    const submitted = { ...value };
    setPending(true);
    try {
      await request();
      setSaved(submitted);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  return <SocialContext value={{ saved, save, pending }}>{children}</SocialContext>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("Social editor requires SocialProvider.");
  return context;
}

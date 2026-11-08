"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialSocial, type SocialDraft } from "./social";

type SocialRequest = (fail: boolean) => Promise<void>;
async function demoRequest(fail: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (fail) throw new Error("The demo save failed. Your changes are still here.");
}
const SocialContext = createContext<{
  saved: SocialDraft;
  save: (value: SocialDraft) => Promise<void>;
  pending: boolean;
  failNext: boolean;
  setFailNext: (value: boolean) => void;
} | null>(null);

export function SocialProvider({ children, request = demoRequest }: { children: ReactNode; request?: SocialRequest }) {
  const [saved, setSaved] = useState(initialSocial);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const saving = useRef(false);
  async function save(value: SocialDraft) {
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
  return <SocialContext value={{ saved, save, pending, failNext, setFailNext }}>{children}</SocialContext>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("Social editor requires SocialProvider.");
  return context;
}

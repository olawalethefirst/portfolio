"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialSocial, validateSocial, type SocialDraft, type SocialRecord } from "./social";
type SocialRequest = (fail: boolean) => Promise<void>;
async function demoRequest(fail: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (fail) throw new Error("The demo request failed. Your changes are still here.");
}
const SocialContext = createContext<{
  records: SocialRecord[];
  save: (id: string, value: SocialDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
  pending: boolean;
  failNext: boolean;
  setFailNext: (value: boolean) => void;
} | null>(null);
export function SocialProvider({ children, request = demoRequest, initialRecords }: { children: ReactNode; request?: SocialRequest; initialRecords?: SocialRecord[] }) {
  const [records, setRecords] = useState(initialRecords ?? initialSocial);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const busy = useRef(false);
  async function run(change: (current: SocialRecord[]) => SocialRecord[]) {
    if (busy.current) throw new Error("A request is already in progress.");
    busy.current = true;
    const fail = failNext;
    setPending(true); setFailNext(false);
    try { await request(fail); setRecords(change); }
    finally { busy.current = false; setPending(false); }
  }
  async function save(id: string, value: SocialDraft) {
    const error = Object.values(validateSocial(value))[0];
    if (error) throw new Error(error);
    const submitted = { ...value, id };
    await run((current) => current.some((record) => record.id === id) ? current.map((record) => record.id === id ? submitted : record) : [...current, submitted]);
  }
  async function remove(id: string) { await run((current) => current.filter((record) => record.id !== id)); }
  return <SocialContext value={{ records, save, remove, pending, failNext, setFailNext }}>{children}</SocialContext>;
}
export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("Contact screens require SocialProvider.");
  return context;
}

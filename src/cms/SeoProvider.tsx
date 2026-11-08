"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialSeo, normalizeSeoPath, validateSeoDefaults, validateSeoRecord, type SeoRecord, type SeoState, type SeoValues } from "./seo";

type SeoRequest = (fail: boolean) => Promise<void>;
async function demoRequest(fail: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (fail) throw new Error("The demo save failed. Your changes are still here.");
}
const SeoContext = createContext<{
  saved: SeoState;
  saveDefaults: (value: SeoValues) => Promise<void>;
  saveRecord: (value: SeoRecord) => Promise<SeoRecord>;
  deleteRecord: (id: string) => Promise<void>;
  pending: boolean;
  failNext: boolean;
  setFailNext: (value: boolean) => void;
} | null>(null);

export function SeoProvider({ children, request = demoRequest, initialState }: { children: ReactNode; request?: SeoRequest; initialState?: SeoState }) {
  const [saved, setSaved] = useState(initialState ?? initialSeo);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const busy = useRef(false);
  async function run(change: (current: SeoState) => SeoState) {
    if (busy.current) throw new Error("A change is already in progress.");
    busy.current = true;
    const fail = failNext;
    setPending(true);
    setFailNext(false);
    try { await request(fail); setSaved(change); }
    finally { busy.current = false; setPending(false); }
  }
  async function saveDefaults(value: SeoValues) {
    const error = Object.values(validateSeoDefaults(value))[0];
    if (error) throw new Error(error);
    const submitted = { title: value.title, description: value.description };
    await run((current) => ({ ...current, defaults: submitted }));
  }
  async function saveRecord(value: SeoRecord) {
    const error = Object.values(validateSeoRecord(value, saved.records))[0];
    const path = normalizeSeoPath(value.path);
    if (error || !path) throw new Error(error ?? "Enter a valid site path.");
    const submitted = { ...value, path };
    await run((current) => ({ ...current, records: current.records.some((record) => record.id === submitted.id)
      ? current.records.map((record) => record.id === submitted.id ? submitted : record)
      : [...current.records, submitted] }));
    return submitted;
  }
  async function deleteRecord(id: string) {
    await run((current) => ({ ...current, records: current.records.filter((record) => record.id !== id) }));
  }
  return <SeoContext value={{ saved, saveDefaults, saveRecord, deleteRecord, pending, failNext, setFailNext }}>{children}</SeoContext>;
}
export function useSeo() {
  const context = useContext(SeoContext);
  if (!context) throw new Error("SEO screens require SeoProvider.");
  return context;
}

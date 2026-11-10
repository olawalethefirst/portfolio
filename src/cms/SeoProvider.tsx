"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { seoRecordSchema, initialSeo, normalizeSeoPath, seoDefaultsSchema, createSeoRecordSchema, type SeoRecord, type SeoState, type SeoValues } from "./seo";

type SeoRequest = () => Promise<void>;
async function demoRequest() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}
const SeoContext = createContext<{
  saved: SeoState;
  saveDefaults: (value: SeoValues) => Promise<void>;
  saveRecord: (value: SeoRecord) => Promise<SeoRecord>;
  deleteRecord: (id: string) => Promise<void>;
  pending: boolean;
  working: DraftStore<SeoRecord>;
} | null>(null);

export function SeoProvider({ children, request = demoRequest, initialState }: { children: ReactNode; request?: SeoRequest; initialState?: SeoState }) {
  const working = useDraftStore<SeoRecord>({ namespace: "seo", schema: seoRecordSchema });
  const [saved, setSaved] = useState(initialState ?? initialSeo);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  async function run(change: (current: SeoState) => SeoState) {
    if (busy.current) throw new Error("A change is already in progress.");
    busy.current = true;
    setPending(true);
    try { await request(); setSaved(change); }
    finally { busy.current = false; setPending(false); }
  }
  async function saveDefaults(value: SeoValues) {
    const submitted = { title: value.title, description: value.description };
    const result = seoDefaultsSchema.safeParse(submitted);
    if (!result.success) throw new Error(result.error.issues[0].message);
    await run((current) => ({ ...current, defaults: submitted }));
  }
  async function saveRecord(value: SeoRecord) {
    const captured = { ...value };
    const result = createSeoRecordSchema(saved.records).safeParse(captured);
    if (!result.success) throw new Error(result.error.issues[0].message);
    const path = normalizeSeoPath(result.data.path);
    if (!path) throw new Error("Enter a valid site path.");
    const submitted = { ...result.data, path };
    await run((current) => ({ ...current, records: current.records.some((record) => record.id === submitted.id)
      ? current.records.map((record) => record.id === submitted.id ? submitted : record)
      : [...current.records, submitted] }));
    return submitted;
  }
  async function deleteRecord(id: string) {
    await run((current) => ({ ...current, records: current.records.filter((record) => record.id !== id) }));
    working.clear(id);
  }
  return <SeoContext value={{ working, saved, saveDefaults, saveRecord, deleteRecord, pending }}>{children}</SeoContext>;
}
export function useSeo() {
  const context = useContext(SeoContext);
  if (!context) throw new Error("SEO screens require SeoProvider.");
  return context;
}

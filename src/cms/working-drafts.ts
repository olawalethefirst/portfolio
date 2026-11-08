"use client";

import { useState, type SetStateAction } from "react";

type WorkingDraft<T> = { id: string; value: T };
export interface DraftStore<T> {
  drafts: Readonly<Record<string, WorkingDraft<T>>>;
  clear: (key: string) => void;
  update: (key: string, initial: WorkingDraft<T>, next: SetStateAction<T>) => void;
}

/** Provider-owned drafts survive editor unmounts; reload persistence is deferred. */
export function useDraftStore<T>(): DraftStore<T> {
  const [drafts, setDrafts] = useState<Record<string, WorkingDraft<T>>>({});
  function update(key: string, initial: WorkingDraft<T>, next: SetStateAction<T>) {
    setDrafts((current) => {
      const previous = current[key] ?? initial;
      const value = typeof next === "function" ? (next as (value: T) => T)(previous.value) : next;
      const draft = { id: previous.id, value };
      return { ...current, [key]: draft, ...(key === "new" ? { [draft.id]: draft } : {}) };
    });
  }
  function clear(key: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[key];
      if (next.new?.id === key) delete next.new;
      return next;
    });
  }
  return { drafts, update, clear };
}

export function useWorkingDraft<T>(store: DraftStore<T>, key: string, initialValue: () => T, recordId?: string) {
  const [initial] = useState(() => ({ id: recordId ?? crypto.randomUUID(), value: initialValue() }));
  const current = store.drafts[key] ?? initial;
  return { ...current, setValue: (next: SetStateAction<T>) => store.update(key, initial, next) };
}

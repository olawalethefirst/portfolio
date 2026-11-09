"use client";

import { useEffect, useState, useSyncExternalStore, type SetStateAction } from "react";
import { z } from "zod";

type WorkingDraft<T> = { id: string; value: T };
export type PersistenceStatus = "idle" | "saving" | "saved" | "error" | "restore-error";
type Snapshot<T> = {
  ready: boolean;
  drafts: Readonly<Record<string, WorkingDraft<T>>>;
  statuses: Readonly<Record<string, PersistenceStatus>>;
  readFailed: boolean;
};
export interface DraftStore<T> extends Snapshot<T> {
  clear: (key: string) => void;
  flush: () => void;
  update: (key: string, initial: WorkingDraft<T>, next: SetStateAction<T>, immediate?: boolean) => void;
}
type DraftOptions<T> = { namespace: string; schema: z.ZodType<T> };

// One provider owns the in-memory drafts, pending writes and storage lifecycle.
function createDraftStore<T>({ namespace, schema }: DraftOptions<T>) {
  const prefix = `portfolio:cms-drafts:v1:${namespace}:`;
  const storedSchema = z.object({ id: z.string(), value: schema });
  let snapshot: Snapshot<T> = { ready: false, drafts: {}, statuses: {}, readFailed: false };
  const serverSnapshot = snapshot;
  const listeners = new Set<() => void>();
  const pending = new Map<string, WorkingDraft<T> | null>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  function publish(next: Snapshot<T>) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function canonicalKey(key: string) {
    return snapshot.drafts.new?.id === key ? "new" : key;
  }
  function flush() {
    clearTimeout(timer);
    const statuses = { ...snapshot.statuses };
    for (const [key, draft] of pending) {
      try {
        const storageKey = prefix + encodeURIComponent(key);
        if (draft) localStorage.setItem(storageKey, JSON.stringify(draft));
        else localStorage.removeItem(storageKey);
        pending.delete(key);
        statuses[key] = draft ? "saved" : "idle";
      } catch {
        statuses[key] = "error";
      }
    }
    publish({ ...snapshot, statuses });
  }
  function restore() {
    if (snapshot.ready) return;
    let drafts: Record<string, WorkingDraft<T>> = {};
    let statuses: Record<string, PersistenceStatus> = {};
    let readFailed = false;
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const storageKey = localStorage.key(index);
        if (!storageKey?.startsWith(prefix)) continue;
        const key = decodeURIComponent(storageKey.slice(prefix.length));
        try {
          const draft = storedSchema.parse(JSON.parse(localStorage.getItem(storageKey)!));
          drafts = { ...drafts, [key]: draft };
          statuses = { ...statuses, [key]: "saved" };
        } catch {
          statuses = { ...statuses, [key]: "restore-error" };
        }
      }
      if (drafts.new) drafts = { ...drafts, [drafts.new.id]: drafts.new };
    } catch {
      readFailed = true;
    }
    publish({ ready: true, drafts, statuses, readFailed });
  }
  function update(key: string, initial: WorkingDraft<T>, next: SetStateAction<T>, immediate = false) {
    if (!snapshot.ready) return;
    const canonical = canonicalKey(key);
    const previous = snapshot.drafts[canonical] ?? initial;
    const value = typeof next === "function" ? (next as (value: T) => T)(previous.value) : next;
    const draft = { id: previous.id, value };
    pending.set(canonical, draft);
    publish({ ...snapshot,
      drafts: { ...snapshot.drafts, [canonical]: draft, ...(canonical === "new" ? { [draft.id]: draft } : {}) },
      statuses: { ...snapshot.statuses, [canonical]: "saving" },
    });
    clearTimeout(timer);
    if (immediate) flush();
    else timer = setTimeout(flush, 300);
  }
  function clear(key: string) {
    const canonical = canonicalKey(key);
    const drafts = { ...snapshot.drafts };
    if (canonical === "new" && drafts.new) delete drafts[drafts.new.id];
    delete drafts[canonical];
    pending.set(canonical, null);
    publish({ ...snapshot, drafts });
    flush();
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    restore, clear, update, flush,
  };
}

export function useDraftStore<T>(options: DraftOptions<T>): DraftStore<T> {
  const [store] = useState(() => createDraftStore(options));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    store.restore();
    const onHidden = () => { if (document.visibilityState === "hidden") store.flush(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", store.flush);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", store.flush);
      store.flush();
    };
  }, [store]);
  return { ...snapshot, clear: store.clear, update: store.update, flush: store.flush };
}

export function useWorkingDraft<T>(store: DraftStore<T>, key: string, initialValue: () => T, recordId?: string) {
  const [initial] = useState(() => ({ id: recordId ?? crypto.randomUUID(), value: initialValue() }));
  const current = store.drafts[key] ?? initial;
  const canonical = store.drafts.new?.id === key ? "new" : key;
  const { flush } = store;
  useEffect(() => () => flush(), [flush]);
  return {
    ...current,
    ready: store.ready,
    persistenceStatus: store.statuses[canonical] ?? (store.readFailed ? "restore-error" : "idle"),
    setValue: (next: SetStateAction<T>) => store.update(key, initial, next),
    reset: (value: T) => store.update(key, initial, value, true),
  };
}

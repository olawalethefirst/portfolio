"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialProjects, projectDraftSchema, projectPublishSchema, type ProjectAction, type ProjectDraft, type ProjectRecord } from "./projects";

type Request = () => Promise<void>;
async function demoRequest() {
  await new Promise((resolve) => setTimeout(resolve, 450));
}
interface ProjectContextValue {
  records: ProjectRecord[];
  pending: boolean;
  working: DraftStore<ProjectDraft>;
  commit: (id: string, draft: ProjectDraft, action: ProjectAction) => Promise<void>;
}
const Context = createContext<ProjectContextValue | null>(null);
export function ProjectProvider({ children, request = demoRequest }: { children: ReactNode; request?: Request }) {
  const working = useDraftStore<ProjectDraft>({ namespace: "projects", schema: projectDraftSchema });
  const [records, setRecords] = useState(initialProjects);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  async function commit(id: string, draft: ProjectDraft, action: ProjectAction) {
    if (busy.current) throw new Error("Another change is still being saved.");
    const captured = { ...draft };
    const submitted = action === "save" ? projectDraftSchema.parse(captured)
      : action === "publish" ? projectPublishSchema.parse(captured) : captured;
    busy.current = true;
    setPending(true);
    try {
      await request();
      if (action === "delete") working.clear(id);
      setRecords((current) => {
        if (action === "delete") return current.filter((item) => item.id !== id);
        const previous = current.find((item) => item.id === id);
        const next: ProjectRecord = {
          id, draft: action === "unpublish" && previous ? previous.draft : submitted,
          published: action === "publish" ? { ...submitted } : action === "unpublish" ? null : previous?.published ?? null,
        };
        return previous ? current.map((item) => item.id === id ? next : item) : [next, ...current];
      });
    } finally { busy.current = false; setPending(false); }
  }
  return <Context value={{ working, records, pending, commit }}>{children}</Context>;
}
export function useProjects() {
  const context = useContext(Context);
  if (!context) throw new Error("Project screens require ProjectProvider.");
  return context;
}

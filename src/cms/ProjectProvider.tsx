"use client";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { initialProjects, type ProjectAction, type ProjectDraft, type ProjectRecord } from "./projects";

type Request = (fail: boolean) => Promise<void>;
async function demoRequest(fail: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (fail) throw new Error("The demo request failed. Your project is unchanged. Try again.");
}
interface ProjectContextValue {
  records: ProjectRecord[];
  move: (id: string, direction: -1 | 1) => void;
  pending: boolean;
  failNext: boolean;
  setFailNext: (value: boolean) => void;
  commit: (id: string, draft: ProjectDraft, action: ProjectAction) => Promise<void>;
}
const Context = createContext<ProjectContextValue | null>(null);
export function ProjectProvider({ children, request = demoRequest }: { children: ReactNode; request?: Request }) {
  const [records, setRecords] = useState(initialProjects);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const busy = useRef(false);
  async function commit(id: string, draft: ProjectDraft, action: ProjectAction) {
    if (busy.current) throw new Error("Another change is still being saved.");
    busy.current = true;
    setPending(true);
    const submitted = { ...draft };
    const fail = failNext;
    setFailNext(false);
    try {
      await request(fail);
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
  function move(id: string, direction: -1 | 1) {
    if (busy.current) return;
    setRecords((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  return <Context value={{ records, move, pending, failNext, setFailNext, commit }}>{children}</Context>;
}
export function useProjects() {
  const context = useContext(Context);
  if (!context) throw new Error("Project screens require ProjectProvider.");
  return context;
}

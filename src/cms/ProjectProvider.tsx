"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";
import { createContext, useContext, type ReactNode } from "react";
import { projectDraftSchema, type ProjectDraft } from "./projects";

interface ProjectContextValue {
  working: DraftStore<ProjectDraft>;
}
const Context = createContext<ProjectContextValue | null>(null);

/**
 * Shared only so the list's "New project" action and the editor's working
 * draft agree on one local-draft store. Save/create/publish/unpublish/delete
 * go through useProjectMutations instead; this holds no server state.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const working = useDraftStore<ProjectDraft>({
    namespace: "projects",
    schema: projectDraftSchema,
  });
  return <Context value={{ working }}>{children}</Context>;
}
export function useProjects() {
  const context = useContext(Context);
  if (!context) throw new Error("Project screens require ProjectProvider.");
  return context;
}

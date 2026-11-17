"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";
import { createContext, useContext, type ReactNode } from "react";
import { publicationDraftSchema, type PublicationDraft } from "./publications";

interface CmsContextValue {
  working: DraftStore<PublicationDraft>;
}
const CmsContext = createContext<CmsContextValue | null>(null);

/**
 * Shared only so the list's "New publication" action and the editor's
 * working draft agree on one local-draft store. Save/create/publish/
 * unpublish/delete go through usePublicationMutations instead; this holds
 * no server state.
 */
export function CmsProvider({ children }: { children: ReactNode }) {
  const working = useDraftStore<PublicationDraft>({
    namespace: "publications",
    schema: publicationDraftSchema,
  });
  return <CmsContext value={{ working }}>{children}</CmsContext>;
}
export function useCms() {
  const context = useContext(CmsContext);
  if (!context) throw new Error("CMS screens require CmsProvider.");
  return context;
}

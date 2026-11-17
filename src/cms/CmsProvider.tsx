"use client";

import { useDraftStore, type DraftStore } from "./working-drafts";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initialPublications } from "./publication-fixtures";
import {
  applyPublicationAction,
  publicationDraftSchema,
  createPublicationPublishSchema,
  type PublicationAction,
  type PublicationDraft,
  type PublicationRecord,
} from "./publications";

type DemoRequest = () => Promise<void>;
const demoRequest: DemoRequest = async () => {
  await new Promise((resolve) => setTimeout(resolve, 450));
};

interface CmsContextValue {
  records: PublicationRecord[];
  pending: boolean;
  working: DraftStore<PublicationDraft>;
  commit: (
    id: string,
    values: PublicationDraft,
    action: PublicationAction | "delete",
  ) => Promise<void>;
}
const CmsContext = createContext<CmsContextValue | null>(null);

export function CmsProvider({
  children,
  initialRecords,
  request = demoRequest,
  today = () => new Date().toISOString().slice(0, 10),
}: {
  children: ReactNode;
  initialRecords?: PublicationRecord[];
  request?: DemoRequest;
  today?: () => string;
}) {
  const working = useDraftStore<PublicationDraft>({ namespace: "publications", schema: publicationDraftSchema });
  const [records, setRecords] = useState(initialRecords ?? initialPublications);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  async function commit(
    id: string,
    values: PublicationDraft,
    action: PublicationAction | "delete",
  ) {
    if (busy.current) throw new Error("Another change is still being saved.");
    const captured = { ...values };
    const submitted = action === "save" ? publicationDraftSchema.parse(captured)
      : action === "publish" ? createPublicationPublishSchema(today()).parse(captured) : captured;
    busy.current = true;
    setPending(true);
    try {
      await request();
      if (action === "delete") working.clear(id);
      setRecords((current) => {
        if (action === "delete") return current.filter((item) => item.id !== id);
        const existing = current.find((item) => item.id === id);
        const next = applyPublicationAction(
          existing ?? { id, draft: submitted, published: null },
          submitted,
          action,
        );
        return existing
          ? current.map((item) => (item.id === id ? next : item))
          : [next, ...current];
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <CmsContext value={{ working, records, pending, commit }}>
      {children}
    </CmsContext>
  );
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) throw new Error("CMS screens require CmsProvider.");
  return context;
}

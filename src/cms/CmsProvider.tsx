"use client";

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
  type PublicationAction,
  type PublicationDraft,
  type PublicationRecord,
} from "./publications";

type DemoRequest = (fail: boolean) => Promise<void>;
const demoRequest: DemoRequest = async (fail) => {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (fail)
    throw new Error(
      "The demo request failed. Your edits are still here. Try again.",
    );
};

interface CmsContextValue {
  records: PublicationRecord[];
  move: (id: string, direction: -1 | 1) => void;
  pending: boolean;
  failNext: boolean;
  setFailNext: (value: boolean) => void;
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
}: {
  children: ReactNode;
  initialRecords?: PublicationRecord[];
  request?: DemoRequest;
}) {
  const [records, setRecords] = useState(initialRecords ?? initialPublications);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const busy = useRef(false);

  async function commit(
    id: string,
    values: PublicationDraft,
    action: PublicationAction | "delete",
  ) {
    if (busy.current) throw new Error("Another change is still being saved.");
    busy.current = true;
    setPending(true);
    const submitted = { ...values };
    const fail = failNext;
    setFailNext(false);
    try {
      await request(fail);
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

  return (
    <CmsContext value={{ records, move, pending, failNext, setFailNext, commit }}>
      {children}
    </CmsContext>
  );
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) throw new Error("CMS screens require CmsProvider.");
  return context;
}

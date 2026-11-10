"use client";

import { HeaderActionBar } from "@/src/components/ui/header-action-bar";
import { useContext, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

import { CmsPreviewVisibility } from "./CmsShell";

// Lives in the owning screen so restoration runs after its controls remount.
export function useCmsPreview(active: boolean, onExit: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const origin = useRef<{ triggerId: string; scroll: number } | null>(null);
  const exit = useRef(onExit);
  useLayoutEffect(() => { exit.current = onExit; });
  useLayoutEffect(() => {
    if (!active) {
      if (origin.current) {
        const { triggerId, scroll } = origin.current;
        // The trigger was remounted with the screen; find its stable ID.
        const trigger = document.getElementById(triggerId);
        trigger?.focus({ preventScroll: true });
        window.scrollTo({ top: scroll, behavior: "instant" });
        origin.current = null;
      }
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    closeRef.current?.focus({ preventScroll: true });
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector('[role="dialog"]')) exit.current();
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [active]);
  function capture(triggerId: string) {
    origin.current = { triggerId, scroll: window.scrollY };
  }
  return { closeRef, capture };
}

export function CmsPreviewFrame({ label, exitLabel, closeRef, onExit, children }: { label: string; exitLabel: string; closeRef: RefObject<HTMLButtonElement | null>; onExit: () => void; children: ReactNode }) {
  const setPreview = useContext(CmsPreviewVisibility);
  useLayoutEffect(() => {
    setPreview?.(true);
    return () => setPreview?.(false);
  }, [setPreview]);
  return <section aria-label={label} className="min-h-dvh bg-surface text-foreground">
    <HeaderActionBar onBack={onExit} backLabel={exitLabel} backButtonRef={closeRef}
      className="sticky top-0 z-[120] border-b border-border bg-surface px-5 py-3 sm:px-8">
      <p className="text-sm font-medium">{label}</p>
    </HeaderActionBar>
    {children}
  </section>;
}

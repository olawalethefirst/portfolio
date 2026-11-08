"use client";

import type { AboutDraft } from "@/src/cms/about";
import { AboutCtaSection } from "@/src/components/about-cta/AboutCtaSection";

export function AboutPreview({ value }: { value: AboutDraft }) {
  const incomplete = !value.heading.trim() || !value.biography.trim();
  return <>
    {incomplete ? <p role="status" className="p-4 text-sm text-muted">Missing content uses preview-only placeholders. These are not saved.</p> : null}
    <AboutCtaSection heading={value.heading.trim() || "Untitled About section"} summary={value.biography.trim() ? value.biography : "Your biography will appear here."} />
  </>;
}

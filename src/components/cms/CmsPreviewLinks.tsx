"use client";

import { ArrowUpRight } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";

export function CmsPreviewLinks({ children, onLocalLink, resolveHref }: {
  children: ReactNode;
  onLocalLink?: (href: string) => boolean;
  resolveHref?: (href: string) => string;
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState("");
  function intercept(event: MouseEvent<HTMLDivElement>) {
    const originalHref = (event.target as Element).closest("a")?.getAttribute("href");
    if (!originalHref) return;
    const href = resolveHref ? resolveHref(originalHref) : originalHref;
    if (onLocalLink?.(href)) { event.preventDefault(); return; }
    if (href.startsWith("#")) return;
    event.preventDefault();
    setError("");
    try {
      const url = new URL(href, window.location.href);
      if (url.protocol === "https:" || url.protocol === "http:") setDestination(url.href);
      else setError("This preview supports web links only.");
    } catch {
      setError("This link is not a valid web address.");
    }
  }
  return <>
    {error ? <p role="alert" className="border border-danger/30 p-4 text-sm text-danger">{error}</p> : null}
    <div onClickCapture={intercept} onAuxClickCapture={(event) => { if (event.button === 1) intercept(event); }}>{children}</div>
    <CmsDialog open={destination !== null} onClose={() => setDestination(null)} title="Open this link?" actions={<>
      <Button variant="ghost" onPress={() => setDestination(null)}>Stay in preview</Button>
      <Button href={destination ?? "#"} target="_blank" rel="noopener noreferrer" onClick={() => setDestination(null)}
        endContent={<ArrowUpRight aria-hidden="true" className="size-4" />}>Open link</Button>
    </>}>
      <p>The link opens in a new tab. Your CMS changes stay here.</p>
      <p className="mt-2 break-all">{destination}</p>
    </CmsDialog>
  </>;
}

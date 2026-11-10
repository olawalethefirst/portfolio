"use client";

import { useEffect, useState } from "react";
import type { PublicationHeading } from "./publication-headings";

/** Keep the activation line aligned with the headings' 2rem scroll margin. */
export function useActivePublicationHeading(headings: readonly PublicationHeading[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const headingIds = JSON.stringify(headings.map((heading) => heading.id));

  useEffect(() => {
    const ids: string[] = JSON.parse(headingIds);
    const elements = ids.map((id) => document.getElementById(id)).filter((node): node is HTMLElement => node !== null);
    if (!elements.length) return;
    let frame: number | null = null;

    function update() {
      frame = null;
      const line = parseFloat(getComputedStyle(document.documentElement).fontSize || "16") * 2;
      let next: string | null = null;
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= line + 1) next = element.id;
        else break;
      }
      const pageHeight = document.documentElement.scrollHeight;
      if (pageHeight > window.innerHeight && window.scrollY + window.innerHeight >= pageHeight - 2 && elements[0].getBoundingClientRect().top < window.innerHeight) {
        next = elements[elements.length - 1].id;
      }
      setActiveId((current) => current === next ? current : next);
    }

    function scheduleUpdate() {
      if (frame === null) frame = requestAnimationFrame(update);
    }

    // Observer notifications cover layout changes around headings; the passive,
    // frame-coalesced scroll check also handles jumps that skip intersections.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(scheduleUpdate);
    elements.forEach((element) => observer?.observe(element));
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    window.addEventListener("pageshow", scheduleUpdate);
    return () => {
      observer?.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      window.removeEventListener("pageshow", scheduleUpdate);
    };
  }, [headingIds]);

  return headings.some((heading) => heading.id === activeId) ? activeId : null;
}

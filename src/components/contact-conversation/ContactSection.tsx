"use client";

import type { ReactNode } from "react";
import { PerspectiveGridSection } from "@/src/components/ui/PerspectiveGridSection";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { cn } from "@/src/components/ui/utils";

export function ContactSection({ children, className, id = "contact" }: { children: ReactNode; className?: string; id?: string }) {
  return <PerspectiveGridSection gridOpacity={0.2} id={id} className={cn("relative left-1/2 isolate flex min-h-dvh w-dvw -translate-x-1/2 items-center overflow-hidden bg-background", className)}>
    <SectionContainer className="grid min-h-dvh w-full content-center gap-16 py-12 pb-[var(--navigation-bottom-clearance)] lg:h-[min(100dvh,56rem)] lg:min-h-0 lg:grid-cols-2 lg:content-normal lg:py-16 lg:pb-[var(--navigation-bottom-clearance)]">{children}</SectionContainer>
  </PerspectiveGridSection>;
}
export function ContactIntroduction({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-start gap-6 lg:justify-between">
    <h2 className="max-w-md text-start text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Let’s make something happen.</h2>
    {children}
  </div>;
}
export function ContactCompletion({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-lg leading-7 text-muted">{children}</p>;
}

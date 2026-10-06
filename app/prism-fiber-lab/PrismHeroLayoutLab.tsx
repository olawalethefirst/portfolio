"use client";

import { useRef } from "react";

import {
  PrismHeroLayout,
  type PrismHeroLayoutHandle,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";
import { Surface } from "@/src/components/ui/Surface";

import { usePrismDiscoveryScroll } from "./usePrismDiscoveryScroll";

export function PrismHeroLayoutLab() {
  const heroRef = useRef<PrismHeroLayoutHandle>(null);
  const scrollOriginRef = usePrismDiscoveryScroll(heroRef);

  return (
    <main
      className="relative isolate min-h-dvh bg-background font-sans text-foreground"
      data-mode="dark"
      data-theme="plum"
      id="layout-review"
    >
      <div
        ref={scrollOriginRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 size-px"
      />

      <section
        aria-label="Prism scroll discovery"
        className="sticky top-0 z-0 h-[200dvh] w-full"
        data-testid="prism-scroll-runway"
      >
        <div className="sticky top-0 h-dvh w-full">
          <PrismHeroLayout ref={heroRef} allowsCameraZoom={false} />
        </div>
      </section>

      <Surface
        aria-hidden="true"
        className="pointer-events-none relative z-10 h-dvh w-full"
        data-testid="prism-glass-panel"
        material="glass"
      >
        {null}
      </Surface>
    </main>
  );
}

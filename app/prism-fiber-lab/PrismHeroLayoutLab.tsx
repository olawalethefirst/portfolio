"use client";

import { useState } from "react";

import {
  PrismHeroLayout,
  type PrismHeroLayoutVariant,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";
import { Button } from "@/src/components/ui/Button";
import { Surface } from "@/src/components/ui/Surface";

const layoutOptions: ReadonlyArray<{
  label: string;
  value: PrismHeroLayoutVariant;
}> = [
  { label: "Two column", value: "two-column" },
  { label: "Three column", value: "three-column" },
];

export function PrismHeroLayoutLab() {
  const [layout, setLayout] = useState<PrismHeroLayoutVariant>("two-column");

  return (
    <main
      className="relative min-h-dvh overflow-x-hidden bg-background font-sans text-foreground"
      data-mode="dark"
      data-theme="plum"
      id="layout-review"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border"
      />
      <Surface
        aria-label="Layout review controls"
        className="absolute right-4 top-4 z-30 hidden items-center gap-2 rounded-2xl p-2 sm:right-6 sm:top-6 sm:flex"
        material="glass"
      >
        <span className="hidden px-2 text-xs font-medium uppercase tracking-[0.14em] text-muted sm:inline">
          Layout study
        </span>
        <div aria-label="Desktop layout" className="flex gap-1" role="group">
          {layoutOptions.map((option) => (
            <Button
              aria-pressed={layout === option.value}
              key={option.value}
              onPress={() => setLayout(option.value)}
              size="sm"
              variant={layout === option.value ? "secondary" : "ghost"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Surface>

      <PrismHeroLayout layout={layout} />
    </main>
  );
}

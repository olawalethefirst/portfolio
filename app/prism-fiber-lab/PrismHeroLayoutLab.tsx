"use client";

import { PrismHeroLayout } from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";

export function PrismHeroLayoutLab() {
  return (
    <main
      className="relative min-h-dvh overflow-x-hidden bg-background font-sans text-foreground"
      data-mode="dark"
      data-theme="plum"
      id="layout-review"
    >
      <PrismHeroLayout />
    </main>
  );
}

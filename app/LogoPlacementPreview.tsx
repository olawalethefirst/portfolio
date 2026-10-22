"use client";

import { useState } from "react";

import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { cn } from "@/src/components/ui/utils";

const placements = [
  { value: "top-left", label: "Top left", alignment: "items-start justify-start" },
  { value: "top-right", label: "Top right", alignment: "items-start justify-end" },
  { value: "center-left", label: "Center left", alignment: "items-center justify-start" },
  { value: "center-right", label: "Center right", alignment: "items-center justify-end" },
  { value: "bottom-left", label: "Bottom left", alignment: "items-end justify-start" },
  { value: "bottom-right", label: "Bottom right", alignment: "items-end justify-end" },
] as const;

export function LogoPlacementPreview() {
  const [placement, setPlacement] = useState<(typeof placements)[number]>(placements[0]);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-30">
        <SectionContainer className={cn(
          "flex h-full pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:pt-[max(1.5rem,env(safe-area-inset-top))]",
          placement.alignment,
        )}>
          <span
            aria-label="Brand logo"
            role="img"
            className="size-11 shrink-0 bg-foreground [mask-image:url('/logo.svg')] [mask-size:contain] [mask-repeat:no-repeat] sm:size-12"
          />
        </SectionContainer>
      </div>

      <details className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-40 w-44 -translate-x-1/2 rounded-xl border border-border bg-surface text-foreground shadow-sm">
        <summary className="cursor-pointer rounded-xl px-3 py-2 text-center text-xs font-medium focus-visible:outline-2 focus-visible:outline-focus">
          Logo placement
        </summary>
        <fieldset className="grid grid-cols-2 gap-1 border-t border-border p-2">
          <legend className="sr-only">Logo position</legend>
          {placements.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                checked={placement.value === option.value}
                className="peer sr-only"
                name="logo-placement"
                onChange={() => setPlacement(option)}
                type="radio"
                value={option.value}
              />
              <span className="flex min-h-11 items-center justify-center rounded-lg px-1 text-xs text-muted peer-checked:bg-surface-secondary peer-checked:font-semibold peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-focus">
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>
      </details>
    </>
  );
}

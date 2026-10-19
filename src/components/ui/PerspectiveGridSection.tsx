import type { ComponentPropsWithRef } from "react";

import { cn } from "./utils";

export interface PerspectiveGridSectionProps extends ComponentPropsWithRef<"section"> {
  /** Grid opacity from 0 to 1; defaults to a subtle background. */
  gridOpacity?: number;
}

export function PerspectiveGridSection({
  children,
  className,
  gridOpacity = 0.1,
  ...props
}: PerspectiveGridSectionProps) {
  return (
    <section {...props} className={cn("relative isolate", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden text-accent"
      >
        <svg
          className="absolute inset-0 size-full [mask-image:linear-gradient(to_top,black_0%,rgb(0_0_0/0.7)_18%,transparent_30%)]"
          fill="none"
          focusable="false"
          opacity={gridOpacity}
          preserveAspectRatio="xMidYMax slice"
          viewBox="0 0 1600 900"
        >
          <g opacity="0.65" stroke="currentColor" strokeWidth="1.5">
            <path d="M0 615H1600" />
            <path d="M0 635H1600M0 662H1600M0 700H1600M0 755H1600M0 835H1600" />
            <path d="M800 615L-240 900M800 615L100 900M800 615L430 900M800 615L670 900M800 615L930 900M800 615L1170 900M800 615L1500 900M800 615L1840 900" />
          </g>
        </svg>
      </div>
      {children}
    </section>
  );
}

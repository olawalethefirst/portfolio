"use client";

import { usePrismAutoplay } from "../../prism-fiber/ui/usePrismAutoplay";
import { HeroControlPanel } from "./HeroControlPanel";

export function HeroControlPanelPreview() {
  const {
    state: activeSegment,
    autoplayProgress,
    isAutoplayRunning,
    selectState,
    toggleAutoplay,
  } = usePrismAutoplay();

  return (
    <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-3xl border border-border p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -left-12 top-8 size-40 rounded-full bg-accent opacity-55"
      />
      <div
        aria-hidden="true"
        className="absolute -right-10 bottom-4 size-44 rotate-12 rounded-[30%] bg-warning opacity-45"
      />
      <HeroControlPanel
        activeSegment={activeSegment}
        autoplayProgress={autoplayProgress}
        className="relative z-10"
        hasEnteredZoom={false}
        hasRotationDrifted={false}
        isAutoplayRunning={isAutoplayRunning}
        isVisible
        onAutoplayToggle={toggleAutoplay}
        onRecentre={() => undefined}
        onSegmentSelect={selectState}
        showPortfolioActions={false}
      />
    </div>
  );
}

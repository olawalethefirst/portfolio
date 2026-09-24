"use client";

import { useCallback, useRef, useState } from "react";

import { HeroControlPanel } from "../../ui/hero-control-panel";
import {
  Prism,
  type PrismHandle,
  type PrismViewState,
} from "../Prism";
import type { PrismState } from "../state/prism-state";
import { usePrismAutoplay } from "./usePrismAutoplay";

export interface PrismPresentationProps {
  initialState?: PrismState;
}

export function PrismPresentation({
  initialState = "idea",
}: PrismPresentationProps) {
  const prismRef = useRef<PrismHandle>(null);
  const [viewState, setViewState] = useState<PrismViewState>({
    hasEnteredZoom: false,
    hasRotationDrifted: false,
  });
  const {
    autoplayProgress,
    isAutoplayRunning,
    pauseAutoplay,
    selectState,
    state,
    toggleAutoplay,
  } = usePrismAutoplay({ initialState });
  const handleViewStateChange = useCallback(
    (nextViewState: PrismViewState) => {
      setViewState(nextViewState);
      if (nextViewState.hasEnteredZoom) pauseAutoplay();
    },
    [pauseAutoplay],
  );

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden bg-background font-sans text-foreground"
      data-mode="dark"
      data-theme="plum"
    >
      <Prism
        ref={prismRef}
        onViewStateChange={handleViewStateChange}
        state={state}
      />
      <p className="pointer-events-none absolute left-5 top-5 z-20 m-0 text-xs text-foreground/60">
        Drag to spin · scroll to zoom
      </p>
      <div className="absolute inset-x-4 bottom-4 z-20 flex justify-center">
        <HeroControlPanel
          activeSegment={state}
          autoplayProgress={autoplayProgress}
          hasEnteredZoom={viewState.hasEnteredZoom}
          hasRotationDrifted={viewState.hasRotationDrifted}
          isAutoplayRunning={isAutoplayRunning}
          isVisible
          onAutoplayToggle={toggleAutoplay}
          onRecentre={() => prismRef.current?.recentreView()}
          onSegmentSelect={selectState}
        />
      </div>
    </main>
  );
}

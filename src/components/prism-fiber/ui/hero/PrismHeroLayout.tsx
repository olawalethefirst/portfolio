"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

import { HeroControlPanel } from "../../../ui/hero-control-panel";
import { Button } from "../../../ui/Button";
import { Prism, type PrismHandle } from "../../Prism";
import { usePrismAutoplay } from "../usePrismAutoplay";
import { PRISM_HERO_CONTENT, PRISM_HERO_TITLE } from "./prism-hero-content";
import { usePrismHomeFrame } from "./usePrismHomeFrame";

export interface PrismHeroLayoutProps {
  allowsCameraZoom?: boolean;
}

export interface PrismHeroLayoutHandle {
  setDiscoveryProgress(progress: number): void;
}

export const PrismHeroLayout = forwardRef<
  PrismHeroLayoutHandle,
  PrismHeroLayoutProps
>(function PrismHeroLayout({ allowsCameraZoom = true }, ref) {
  const prismRef = useRef<PrismHandle>(null);
  const {
    bottomBoundaryRef,
    canvasRef,
    homeFrame,
    initialRegionRef,
    topBoundaryRef,
  } = usePrismHomeFrame();
  const {
    autoplayProgress,
    canAutoplay,
    isAutoplayRunning,
    pauseAutoplay,
    selectState,
    state,
    toggleAutoplay,
  } = usePrismAutoplay();
  const content = PRISM_HERO_CONTENT[state];

  useImperativeHandle(ref, () => ({
    setDiscoveryProgress(progress) {
      prismRef.current?.setDiscoveryProgress(progress);
    },
  }));

  return (
    <section
      className="relative h-dvh w-full overflow-hidden"
      data-testid="prism-hero"
    >
      <div
        ref={canvasRef}
        className="absolute inset-0 z-0 h-full min-h-44 w-full overflow-hidden"
      >
        <Prism
          ref={prismRef}
          allowsCameraZoom={allowsCameraZoom}
          className="absolute inset-0"
          homeFrame={homeFrame}
          onInteractionStart={pauseAutoplay}
          state={state}
        />
      </div>

      <div
        className="pointer-events-none relative z-10 mx-auto h-full w-full max-w-7xl md:landscape:grid md:landscape:grid-cols-2 md:landscape:items-center md:landscape:gap-x-8 md:landscape:px-8 md:landscape:py-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10 lg:px-12 lg:py-12"
        data-testid="prism-content-container"
      >
        <div
          ref={initialRegionRef}
          className="hidden self-stretch md:landscape:col-start-2 md:landscape:row-start-1 md:landscape:block lg:col-start-2 lg:row-start-1 lg:block"
          data-testid="prism-initial-region"
        />

        <div
          ref={topBoundaryRef}
          className="pointer-events-none absolute inset-x-4 top-4 z-10 mx-auto flex w-auto max-w-xl flex-col items-center text-center md:landscape:relative md:landscape:inset-auto md:landscape:col-start-1 md:landscape:row-span-2 md:landscape:row-start-1 md:landscape:w-4/5 md:landscape:items-start md:landscape:justify-self-end md:landscape:self-center md:landscape:text-left lg:relative lg:inset-auto lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-4/5 lg:items-start lg:justify-self-end lg:self-center lg:text-left"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:mb-4">
            Product delivery
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-[0.98] tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
            {PRISM_HERO_TITLE}
          </h1>
          <h2 className="hidden lg:block mt-2 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
            {content.tagline}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted sm:text-base sm:leading-7">
            {content.description}
          </p>
          <div className="pointer-events-auto mt-4 flex flex-nowrap gap-3 sm:mt-6">
            <Button className="w-[70px]" href="#work" size="sm">
              Work
            </Button>
            <Button
              className="w-[70px]"
              href="#contact"
              size="sm"
              variant="outline"
            >
              Hire
            </Button>
          </div>
        </div>

        <aside
          ref={bottomBoundaryRef}
          aria-label="Prism controls"
          className="pointer-events-auto absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex w-auto flex-col items-center justify-end gap-2 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:bottom-[max(2rem,env(safe-area-inset-bottom))]"
          id="prism-layout-controls"
        >
          <HeroControlPanel
            activeSegment={state}
            autoplayProgress={autoplayProgress}
            canAutoplay={canAutoplay}
            isAutoplayRunning={isAutoplayRunning}
            onAutoplayToggle={toggleAutoplay}
            onRecentre={() => prismRef.current?.recentreView()}
            onSegmentSelect={selectState}
          />
        </aside>
      </div>
    </section>
  );
});

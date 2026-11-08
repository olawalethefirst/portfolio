"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BriefcaseBusiness, Mail } from "lucide-react";

import { HeroControlPanel } from "../../../ui/hero-control-panel";
import { SectionContainer } from "../../../ui/SectionContainer";
import { Button } from "../../../ui/Button";
import { Prism, type PrismHandle } from "../../Prism";
import { usePrismAutoplay } from "../usePrismAutoplay";
import { PRISM_INITIAL_STATE, type PrismState } from "../../state/prism-state";
import { PRISM_HERO_DEFAULT_CONTENT, type PrismHeroContent } from "./prism-hero-content";
import { usePrismHomeFrame } from "./usePrismHomeFrame";
import styles from "./PrismHeroLayout.module.css";

interface PrismHeroLayoutBaseProps {
  allowsCameraZoom?: boolean;
}

export type PrismHeroLayoutProps =
  | (PrismHeroLayoutBaseProps & {
      mode?: "live";
      content?: never;
      initialStage?: never;
      onStageChange?: never;
    })
  | (PrismHeroLayoutBaseProps & {
      mode: "preview";
      content: PrismHeroContent;
      initialStage?: PrismState;
      onStageChange?: (state: PrismState) => void;
    });

export interface PrismHeroLayoutHandle {
  setDiscoveryProgress(progress: number): void;
}

export const PrismHeroLayout = forwardRef<
  PrismHeroLayoutHandle,
  PrismHeroLayoutProps
>(function PrismHeroLayout(props, ref) {
  const allowsCameraZoom = props.allowsCameraZoom ?? true;
  const preview = props.mode === "preview";
  const content = preview ? props.content : PRISM_HERO_DEFAULT_CONTENT;
  const initialStage = preview ? props.initialStage ?? PRISM_INITIAL_STATE : PRISM_INITIAL_STATE;
  const onStageChange = preview ? props.onStageChange : undefined;
  const prismRef = useRef<PrismHandle>(null);
  const {
    bottomBoundaryRef,
    canvasRef,
    compositionRef,
    homeFrame,
    centersDuringDiscovery,
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
  } = usePrismAutoplay(initialStage);
  useEffect(() => onStageChange?.(state), [onStageChange, state]);
  const stage = content.stages[state];

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
          centersDuringDiscovery={centersDuringDiscovery}
          onInteractionStart={pauseAutoplay}
          state={state}
        />
      </div>

      <SectionContainer className={`${styles.container} pointer-events-none h-full`}>
        <div className="pointer-events-none relative h-full w-full">
          <div
            ref={compositionRef}
            className={`${styles.composition} pointer-events-none relative z-10 mx-auto h-full w-full md:landscape:grid md:landscape:grid-cols-2 md:landscape:items-center md:landscape:gap-x-8 md:landscape:py-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-10 lg:py-12`}
            data-testid="prism-content-container"
          >
            <div
              ref={topBoundaryRef}
              className={`${styles.editorial} pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto flex w-auto max-w-xl flex-col items-center text-center md:landscape:relative md:landscape:inset-auto md:landscape:col-start-1 md:landscape:row-span-2 md:landscape:row-start-1 md:landscape:w-full md:landscape:mx-0 md:landscape:items-start md:landscape:justify-self-start md:landscape:self-center md:landscape:text-left lg:relative lg:inset-auto lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-full lg:mx-0 lg:items-start lg:justify-self-start lg:self-center lg:text-left`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:mb-4">
                {content.eyebrow}
              </p>
              <h1 className="max-w-2xl text-3xl font-semibold leading-[0.98] tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
                {content.headline}
              </h1>
              <h2 className="hidden lg:block mt-2 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                {stage.tagline}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted sm:text-base sm:leading-7">
                {stage.description}
              </p>
              <div className="pointer-events-auto mt-4 flex flex-nowrap gap-3 sm:mt-6">
                <Button
                  className="min-w-24 gap-2"
                  href="/#work"
                  size="sm"
                  startContent={<BriefcaseBusiness aria-hidden="true" className="size-4 shrink-0" />}
                >
                  Work
                </Button>
                <Button
                  className="min-w-24 gap-2"
                  href="/contact"
                  size="sm"
                  startContent={<Mail aria-hidden="true" className="size-4 shrink-0" />}
                  variant="outline"
                >
                  Hire
                </Button>
              </div>
            </div>

            <div
              ref={initialRegionRef}
              className={`${styles.slot} hidden self-stretch md:landscape:col-start-2 md:landscape:row-start-1 md:landscape:block lg:col-start-2 lg:row-start-1 lg:block`}
              data-testid="prism-initial-region"
            />

            <aside
              ref={bottomBoundaryRef}
              aria-label="Prism controls"
              className={`${styles.controls} pointer-events-auto absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex w-auto flex-col items-center justify-end gap-2 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:bottom-[max(2rem,env(safe-area-inset-bottom))]`}
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
        </div>
      </SectionContainer>
    </section>
  );
});

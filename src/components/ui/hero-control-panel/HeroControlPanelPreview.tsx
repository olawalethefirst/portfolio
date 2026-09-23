"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { Surface } from "../Surface";
import { Switch } from "../Switch";
import { HeroControlPanel } from "./HeroControlPanel";
import type { HeroSegment } from "./HeroControlPanel";

const previewSegments: readonly HeroSegment[] = [
  "idea",
  "iterate",
  "solution",
];

function getNextSegment(activeSegment: HeroSegment): HeroSegment {
  const currentIndex = previewSegments.indexOf(activeSegment);
  return previewSegments[(currentIndex + 1) % previewSegments.length];
}

export function HeroControlPanelPreview() {
  const [activeSegment, setActiveSegment] = useState<HeroSegment>("idea");
  const [isAutoplayRunning, setIsAutoplayRunning] = useState(true);
  const [hasEnteredZoom, setHasEnteredZoom] = useState(false);
  const [hasRotationDrifted, setHasRotationDrifted] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const autoplayProgress = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isAutoplayRunning) {
      autoplayProgress.stop();
      return;
    }

    autoplayProgress.jump(0);

    if (shouldReduceMotion) {
      autoplayProgress.jump(100);
      return;
    }

    const playback = animate(autoplayProgress, 100, {
      duration: 6,
      ease: "linear",
      onComplete: () => {
        setActiveSegment((currentSegment) => getNextSegment(currentSegment));
      },
    });

    return () => playback.stop();
  }, [activeSegment, autoplayProgress, isAutoplayRunning, shouldReduceMotion]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
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
          hasEnteredZoom={hasEnteredZoom}
          hasRotationDrifted={hasRotationDrifted}
          isAutoplayRunning={isAutoplayRunning}
          isVisible={isPanelVisible}
          onAutoplayToggle={() => setIsAutoplayRunning((isRunning) => !isRunning)}
          onRecentre={() => setHasRotationDrifted(false)}
          onSegmentSelect={(segment) => {
            autoplayProgress.set(0);
            setActiveSegment(segment);
          }}
        />
        {!isPanelVisible ? (
          <p className="relative z-10 text-sm text-muted">Panel hidden</p>
        ) : null}
      </div>

      <Surface className="flex flex-col gap-4 rounded-2xl border border-border p-4">
        <div>
          <h3 className="font-semibold">Manual state</h3>
          <p aria-live="polite" className="mt-1 text-xs leading-5 text-muted">
            Active segment: {activeSegment}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Switch
            aria-label="Autoplay running"
            isSelected={isAutoplayRunning}
            onValueChange={setIsAutoplayRunning}
          >
            Autoplay running
          </Switch>
          <Switch
            aria-label="Zoom entered"
            isSelected={hasEnteredZoom}
            onValueChange={(isEntered) => {
              setHasEnteredZoom(isEntered);
              if (!isEntered) setHasRotationDrifted(false);
            }}
          >
            Zoom entered
          </Switch>
          <Switch
            aria-label="Rotation drifted"
            isDisabled={!hasEnteredZoom}
            isSelected={hasRotationDrifted}
            onValueChange={setHasRotationDrifted}
          >
            Rotation drifted
          </Switch>
          <Switch
            aria-label="Panel visible"
            isSelected={isPanelVisible}
            onValueChange={setIsPanelVisible}
          >
            Panel visible
          </Switch>
        </div>
      </Surface>
    </div>
  );
}

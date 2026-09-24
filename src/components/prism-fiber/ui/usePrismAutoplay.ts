"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import type { PrismState } from "../state/prism-state";

const AUTOPLAY_DURATION_SECONDS = 6;

export interface UsePrismAutoplayOptions {
  initialState?: PrismState;
  initiallyRunning?: boolean;
}

function getNextState(state: PrismState): PrismState {
  switch (state) {
    case "idea":
      return "iterate";
    case "iterate":
      return "solution";
    case "solution":
      return "idea";
  }
}

export function usePrismAutoplay({
  initialState = "idea",
  initiallyRunning = true,
}: UsePrismAutoplayOptions = {}) {
  const [state, setState] = useState<PrismState>(initialState);
  const [isAutoplayRunning, setIsAutoplayRunning] =
    useState(initiallyRunning);
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
      duration: AUTOPLAY_DURATION_SECONDS,
      ease: "linear",
      onComplete: () => setState(getNextState),
    });

    return () => playback.stop();
  }, [autoplayProgress, isAutoplayRunning, shouldReduceMotion, state]);

  const selectState = useCallback(
    (nextState: PrismState) => {
      autoplayProgress.stop();
      autoplayProgress.jump(0);
      setState(nextState);
    },
    [autoplayProgress],
  );
  const playAutoplay = useCallback(() => setIsAutoplayRunning(true), []);
  const pauseAutoplay = useCallback(() => setIsAutoplayRunning(false), []);
  const toggleAutoplay = useCallback(
    () => setIsAutoplayRunning((isRunning) => !isRunning),
    [],
  );

  return {
    state,
    autoplayProgress,
    isAutoplayRunning,
    selectState,
    playAutoplay,
    pauseAutoplay,
    toggleAutoplay,
  };
}

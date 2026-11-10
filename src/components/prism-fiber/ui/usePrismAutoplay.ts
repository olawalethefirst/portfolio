"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import {
  getNextPrismState,
  PRISM_INITIAL_STATE,
  type PrismState,
} from "../state/prism-state";

const AUTOPLAY_DURATION_SECONDS = 6;

export function usePrismAutoplay(initialState: PrismState = PRISM_INITIAL_STATE) {
  const [state, setState] = useState<PrismState>(initialState);
  const [isAutoplayRequested, setIsAutoplayRequested] = useState(true);
  const autoplayProgress = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const canAutoplay = !shouldReduceMotion;
  const isAutoplayRunning = isAutoplayRequested && canAutoplay;

  useEffect(() => {
    if (!isAutoplayRunning) {
      autoplayProgress.stop();
      if (!canAutoplay) autoplayProgress.jump(0);
      return;
    }

    autoplayProgress.jump(0);
    const playback = animate(autoplayProgress, 100, {
      duration: AUTOPLAY_DURATION_SECONDS,
      ease: "linear",
      onComplete: () => setState(getNextPrismState),
    });

    return () => playback.stop();
  }, [autoplayProgress, canAutoplay, isAutoplayRunning, state]);

  const selectState = useCallback(
    (nextState: PrismState) => {
      autoplayProgress.stop();
      autoplayProgress.jump(0);
      setState(nextState);
    },
    [autoplayProgress],
  );
  const pauseAutoplay = useCallback(() => setIsAutoplayRequested(false), []);
  const toggleAutoplay = useCallback(
    () => setIsAutoplayRequested((isRunning) => !isRunning),
    [],
  );

  return {
    state,
    autoplayProgress,
    canAutoplay,
    isAutoplayRunning,
    selectState,
    pauseAutoplay,
    toggleAutoplay,
  };
}

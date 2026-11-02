"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";

export interface PrismDiscoveryTarget {
  setDiscoveryProgress(progress: number): void;
}

export function calculatePrismDiscoveryProgress(
  scrollPosition: number,
  originPosition: number,
  viewportHeight: number,
) {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;

  const progress = (scrollPosition - originPosition) / viewportHeight;
  return Math.min(Math.max(progress, 0), 1);
}

export function usePrismDiscoveryScroll(
  prismRef: RefObject<PrismDiscoveryTarget | null>,
) {
  const originRef = useRef<HTMLDivElement>(null);
  const originPositionRef = useRef(0);
  const shouldReduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const origin = originRef.current;
    if (!origin) return;

    const updateProgress = () => {
      const progress = shouldReduceMotion
        ? 0
        : calculatePrismDiscoveryProgress(
            window.scrollY,
            originPositionRef.current,
            window.innerHeight,
          );

      prismRef.current?.setDiscoveryProgress(progress);
    };
    const measureOrigin = () => {
      originPositionRef.current =
        window.scrollY + origin.getBoundingClientRect().top;
      updateProgress();
    };

    measureOrigin();
    window.addEventListener("resize", measureOrigin);
    window.addEventListener("scroll", updateProgress, { passive: true });

    return () => {
      window.removeEventListener("resize", measureOrigin);
      window.removeEventListener("scroll", updateProgress);
    };
  }, [prismRef, shouldReduceMotion]);

  return originRef;
}

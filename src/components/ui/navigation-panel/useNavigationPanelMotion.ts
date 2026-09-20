import {
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type NavigationPanelVisualPhase = "closed" | "transitioning" | "open";

const openingTransition = {
  duration: 0.36,
  ease: [0.22, 1, 0.36, 1] as const,
  type: "tween" as const,
};

const closingTransition = {
  duration: 0.36,
  ease: [0.65, 0, 0.35, 1] as const,
  type: "tween" as const,
};

export function getNavigationPanelMotionTransition(isOpening: boolean) {
  return isOpening ? openingTransition : closingTransition;
}

export function useNavigationPanelMotion(isOpen: boolean) {
  const [visualPhase, setVisualPhase] =
    useState<NavigationPanelVisualPhase>("closed");
  const animationRunRef = useRef(0);
  const animationRef = useRef<{ stop: () => void } | null>(null);
  const progress = useMotionValue(0);
  const panelProgress = useTransform(
    progress,
    [0, 0.2, 1],
    [0, 0, 1],
  );
  const shouldReduceMotion = useReducedMotion();

  const beginTransition = useCallback(() => {
    setVisualPhase("transitioning");
  }, []);

  useEffect(() => {
    const target = isOpen ? 1 : 0;
    const run = animationRunRef.current + 1;
    animationRunRef.current = run;
    animationRef.current?.stop();

    const complete = () => {
      if (animationRunRef.current !== run) return;
      setVisualPhase(isOpen ? "open" : "closed");
    };

    if (shouldReduceMotion) {
      progress.jump(target);
      complete();
      return;
    }

    if (progress.get() === target) {
      complete();
      return;
    }

    const animation = animate(
      progress,
      target,
      getNavigationPanelMotionTransition(isOpen),
    );
    animationRef.current = animation;
    void animation.finished.then(complete);

    return () => animation.stop();
  }, [isOpen, progress, shouldReduceMotion]);

  return {
    beginTransition,
    panelProgress,
    progress,
    shouldReduceMotion,
    visualPhase,
  };
}

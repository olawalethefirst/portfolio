import {
  animate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useEffect } from "react";

const openingTransition = {
  duration: 0.15,
  ease: [0.22, 1, 0.36, 1] as const,
  type: "tween" as const,
};

const closingTransition = {
  duration: 0.15,
  // Start contracting immediately and keep motion visible throughout dismissal.
  ease: "linear" as const,
  type: "tween" as const,
};

export function getNavigationPanelMotionTransition(isOpening: boolean) {
  return isOpening ? openingTransition : closingTransition;
}

export function useNavigationPanelMotion(isOpen: boolean) {
  const progress = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const target = isOpen ? 1 : 0;
    if (shouldReduceMotion) {
      progress.jump(target);
      return;
    }

    if (progress.get() === target) return;

    const animation = animate(
      progress,
      target,
      getNavigationPanelMotionTransition(isOpen),
    );
    // Stop the current tween before reversing or unmounting. No completion
    // callback is needed: animation never controls React's interaction state.
    return () => animation.stop();
  }, [isOpen, progress, shouldReduceMotion]);

  return {
    // Reveal from the first progress update, without a separate staging hold.
    panelProgress: progress,
    progress,
    shouldReduceMotion,
  };
}

import { motion, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { memo, type ReactNode } from "react";

import { cn } from "../utils";

export type AnimatedScaleSwapActive = "primary" | "secondary" | "none";

export interface AnimatedScaleSwapProps {
  active: AnimatedScaleSwapActive;
  primary: ReactNode;
  progress: MotionValue<number>;
  secondary: ReactNode;
  className?: string;
}

/**
 * Memoised because the panel re-renders around it while the reveal runs, and
 * the swap itself only depends on `active`. This holds only while the caller
 * keeps `primary`, `secondary`, and `progress` stable — `NavigationPanel` does.
 */
export const AnimatedScaleSwap = memo(function AnimatedScaleSwap({
  active,
  primary,
  progress,
  secondary,
  className,
}: AnimatedScaleSwapProps) {
  const primaryVisibility = useTransform(progress, [0, 0.6, 1], [1, 0, 0]);
  const secondaryVisibility = useTransform(
    progress,
    [0, 0.4, 1],
    [0, 0, 1],
  );

  return (
    <div className={cn("grid place-items-center", className)}>
      <motion.div
        aria-hidden={active !== "primary" || undefined}
        className={cn(
          "[grid-area:1/1] origin-center",
          active !== "primary" && "pointer-events-none",
        )}
        inert={active !== "primary" || undefined}
        style={{ scale: primaryVisibility }}
      >
        {primary}
      </motion.div>

      <motion.div
        aria-hidden={active !== "secondary" || undefined}
        className={cn(
          "[grid-area:1/1] origin-center",
          active !== "secondary" && "pointer-events-none",
        )}
        inert={active !== "secondary" || undefined}
        style={{ scale: secondaryVisibility }}
      >
        {secondary}
      </motion.div>
    </div>
  );
});

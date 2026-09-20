import { motion, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "../utils";

export type AnimatedScaleSwapActive = "primary" | "secondary" | "none";

export interface AnimatedScaleSwapProps {
  active: AnimatedScaleSwapActive;
  primary: ReactNode;
  progress: MotionValue<number>;
  secondary: ReactNode;
  className?: string;
}

export function AnimatedScaleSwap({
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
        style={{ opacity: primaryVisibility, scale: primaryVisibility }}
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
        style={{ opacity: secondaryVisibility, scale: secondaryVisibility }}
      >
        {secondary}
      </motion.div>
    </div>
  );
}

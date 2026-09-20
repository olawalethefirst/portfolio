import { motion, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "../utils";

export interface AnimatedAutoHeightProps {
  children: ReactNode;
  progress: MotionValue<number>;
  className?: string;
}

export function AnimatedAutoHeight({
  children,
  progress,
  className,
}: AnimatedAutoHeightProps) {
  const gridTemplateRows = useTransform(progress, (value) => `${value}fr`);

  return (
    <motion.div
      className={cn("grid", className)}
      style={{ gridTemplateRows }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

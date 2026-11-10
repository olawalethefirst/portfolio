"use client";

import { motion, useScroll } from "motion/react";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll({ trackContentSize: true });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left bg-accent"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

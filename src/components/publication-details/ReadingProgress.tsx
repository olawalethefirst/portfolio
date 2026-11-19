"use client";

import { motion, useScroll } from "motion/react";
import { useLayoutEffect, useRef } from "react";

/** Tracks progress through the enclosing <article> only, not the whole page. */
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  // Declared before useScroll so the target is set when scroll tracking attaches.
  useLayoutEffect(() => {
    articleRef.current = barRef.current?.closest("article") ?? null;
  }, []);
  const { scrollYProgress } = useScroll({
    target: articleRef,
    offset: ["start start", "end end"],
    trackContentSize: true,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left bg-accent"
      ref={barRef}
      style={{ scaleX: scrollYProgress }}
    />
  );
}

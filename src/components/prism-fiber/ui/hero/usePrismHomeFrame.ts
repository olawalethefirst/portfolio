"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { PrismHomeFrame } from "../../stage/prism-home-frame";
import { measurePrismHomeFrame } from "./prism-home-frame-measurement";

const FRAME_CLEARANCE_REM = 1;
const MINIMUM_FRAME_HEIGHT_REM = 11;
const MINIMUM_FRAME_WIDTH_REM = 20;
const DEFAULT_ROOT_FONT_SIZE = 16;

function framesMatch(
  current: PrismHomeFrame | undefined,
  next: PrismHomeFrame | undefined,
) {
  return (
    current?.left === next?.left &&
    current?.top === next?.top &&
    current?.width === next?.width &&
    current?.height === next?.height
  );
}

function getRootFontSize() {
  const rootFontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return Number.isFinite(rootFontSize) && rootFontSize > 0
    ? rootFontSize
    : DEFAULT_ROOT_FONT_SIZE;
}

export function usePrismHomeFrame() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialRegionRef = useRef<HTMLDivElement>(null);
  const topBoundaryRef = useRef<HTMLDivElement>(null);
  const bottomBoundaryRef = useRef<HTMLElement>(null);
  const homeFrameRef = useRef<PrismHomeFrame | undefined>(undefined);
  const [homeFrame, setHomeFrame] = useState<PrismHomeFrame>();

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const initialRegion = initialRegionRef.current;
    const topBoundary = topBoundaryRef.current;
    const bottomBoundary = bottomBoundaryRef.current;
    if (!canvas || !initialRegion || !topBoundary || !bottomBoundary) return;

    const update = () => {
      const rootFontSize = getRootFontSize();
      const initialRegionRect = initialRegion.getBoundingClientRect();
      const nextFrame = measurePrismHomeFrame({
        bottomBoundaryRect: bottomBoundary.getBoundingClientRect(),
        canvasRect: canvas.getBoundingClientRect(),
        clearance: FRAME_CLEARANCE_REM * rootFontSize,
        initialRegionRect,
        minimumHeight: MINIMUM_FRAME_HEIGHT_REM * rootFontSize,
        minimumWidth: MINIMUM_FRAME_WIDTH_REM * rootFontSize,
        topBoundaryRect: topBoundary.getBoundingClientRect(),
      });
      if (framesMatch(homeFrameRef.current, nextFrame)) return;
      homeFrameRef.current = nextFrame;
      setHomeFrame(nextFrame);
    };

    update();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    observer.observe(initialRegion);
    observer.observe(topBoundary);
    observer.observe(bottomBoundary);

    return () => observer.disconnect();
  }, []);

  return {
    bottomBoundaryRef,
    canvasRef,
    homeFrame,
    initialRegionRef,
    topBoundaryRef,
  };
}

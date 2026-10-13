"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { PrismHomeFrame } from "../../stage/prism-home-frame";
import { measurePrismHomeFrame } from "./prism-home-frame-measurement";
import { calculatePrismPortraitSpread, PRISM_PORTRAIT_SPREAD_FACTOR } from "./prism-portrait-spread";

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
  const compositionRef = useRef<HTMLDivElement>(null);
  const initialRegionRef = useRef<HTMLDivElement>(null);
  const topBoundaryRef = useRef<HTMLDivElement>(null);
  const bottomBoundaryRef = useRef<HTMLElement>(null);
  const homeFrameRef = useRef<PrismHomeFrame | undefined>(undefined);
  const [homeFrame, setHomeFrame] = useState<PrismHomeFrame>();
  const [centersDuringDiscovery, setCentersDuringDiscovery] = useState(false);
  const centersDuringDiscoveryRef = useRef(false);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const initialRegion = initialRegionRef.current;
    const topBoundary = topBoundaryRef.current;
    const bottomBoundary = bottomBoundaryRef.current;
    if (!canvas || !initialRegion || !topBoundary || !bottomBoundary) return;

    let lastFailure: string | undefined;

    const update = () => {
      const rootFontSize = getRootFontSize();
      const initialRegionRect = initialRegion.getBoundingClientRect();
      const composition = compositionRef.current;
      const compositionStyle = composition && getComputedStyle(composition);
      const isPortrait = compositionStyle?.getPropertyValue("--prism-portrait-spread").trim() === "1";
      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.width <= 0 || canvasRect.height <= 0) return;
      if (isPortrait && composition && compositionStyle) {
        const compositionRect = composition.getBoundingClientRect();
        const top = Number.parseFloat(compositionStyle.top);
        const bottom = Number.parseFloat(compositionStyle.bottom);
        const input = {
          availableRect: {
            left: compositionRect.left,
            top: canvasRect.top + top,
            width: compositionRect.width,
            height: canvasRect.height - top - bottom,
          },
          editorialHeight: topBoundary.getBoundingClientRect().height,
          controlsHeight: bottomBoundary.getBoundingClientRect().height,
          gap: FRAME_CLEARANCE_REM * rootFontSize,
        };
        const spread = calculatePrismPortraitSpread(input);
        if (!spread.ok) {
          composition.style.removeProperty("--portrait-group-height");
          const failure = JSON.stringify({ ...input, remainingHeight: spread.remainingHeight, factor: PRISM_PORTRAIT_SPREAD_FACTOR, state: topBoundary.textContent });
          if (failure !== lastFailure) console.error("Portrait Prism spread does not fit:", failure);
          lastFailure = failure;
          return;
        }
        lastFailure = undefined;
        const height = `${spread.groupHeight}px`;
        if (composition.style.getPropertyValue("--portrait-group-height") !== height) {
          composition.style.setProperty("--portrait-group-height", height);
        }
      }
      const nextCentersDuringDiscovery = !isPortrait && getComputedStyle(initialRegion).display !== "none";
      if (centersDuringDiscoveryRef.current !== nextCentersDuringDiscovery) {
        centersDuringDiscoveryRef.current = nextCentersDuringDiscovery;
        setCentersDuringDiscovery(nextCentersDuringDiscovery);
      }
      const nextFrame = measurePrismHomeFrame({
        bottomBoundaryRect: bottomBoundary.getBoundingClientRect(),
        canvasRect,
        clearance: FRAME_CLEARANCE_REM * rootFontSize,
        initialRegionRect,
        portraitCompositionRect: isPortrait ? composition?.getBoundingClientRect() : undefined,
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
    if (compositionRef.current) observer.observe(compositionRef.current);
    observer.observe(initialRegion);
    observer.observe(topBoundary);
    observer.observe(bottomBoundary);

    return () => observer.disconnect();
  }, []);

  return {
    bottomBoundaryRef,
    canvasRef,
    compositionRef,
    homeFrame,
    centersDuringDiscovery,
    initialRegionRef,
    topBoundaryRef,
  };
}

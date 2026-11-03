import type { PrismHomeFrame } from "../../stage/prism-home-frame";

interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface PrismHomeFrameMeasurement {
  readonly bottomBoundaryRect: RectLike;
  readonly canvasRect: RectLike;
  readonly clearance: number;
  readonly horizontalInset?: number;
  readonly initialRegionRect?: RectLike;
  readonly portraitSlotRect?: RectLike;
  readonly minimumHeight: number;
  readonly minimumWidth: number;
  readonly topBoundaryRect: RectLike;
}

const DEFAULT_HORIZONTAL_INSET = 0.05;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function overlapsRegion(
  rect: RectLike,
  region: { left: number; top: number; right: number; bottom: number },
) {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.left + rect.width > region.left &&
    rect.left < region.right &&
    rect.top + rect.height > region.top &&
    rect.top < region.bottom
  );
}

function enforceMinimumHeight(
  top: number,
  bottom: number,
  canvasTop: number,
  canvasBottom: number,
  requestedMinimum: number,
) {
  const minimumHeight = Math.min(
    Math.max(requestedMinimum, 0),
    canvasBottom - canvasTop,
  );
  if (bottom - top >= minimumHeight) return { top, bottom };

  const midpoint = (top + bottom) / 2;
  let adjustedTop = midpoint - minimumHeight / 2;
  let adjustedBottom = adjustedTop + minimumHeight;

  if (adjustedTop < canvasTop) {
    adjustedTop = canvasTop;
    adjustedBottom = canvasTop + minimumHeight;
  }
  if (adjustedBottom > canvasBottom) {
    adjustedBottom = canvasBottom;
    adjustedTop = canvasBottom - minimumHeight;
  }

  return { top: adjustedTop, bottom: adjustedBottom };
}

export function measurePrismHomeFrame({
  bottomBoundaryRect,
  canvasRect,
  clearance,
  horizontalInset = DEFAULT_HORIZONTAL_INSET,
  initialRegionRect,
  portraitSlotRect,
  minimumHeight,
  minimumWidth,
  topBoundaryRect,
}: PrismHomeFrameMeasurement): PrismHomeFrame | undefined {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return undefined;

  if (portraitSlotRect) {
    return {
      left: (portraitSlotRect.left - canvasRect.left) / canvasRect.width,
      top: (portraitSlotRect.top - canvasRect.top) / canvasRect.height,
      width: portraitSlotRect.width / canvasRect.width,
      height: portraitSlotRect.height / canvasRect.height,
    };
  }

  const canvasBottom = canvasRect.top + canvasRect.height;
  const canvasRight = canvasRect.left + canvasRect.width;
  const measuredRegionLeft = clamp(
    initialRegionRect?.left ?? canvasRight,
    canvasRect.left,
    canvasRight,
  );
  const measuredRegionRight = clamp(
    (initialRegionRect?.left ?? canvasRight) +
      (initialRegionRect?.width ?? 0),
    canvasRect.left,
    canvasRight,
  );
  if (
    (initialRegionRect?.height ?? 0) > 0 &&
    measuredRegionRight - measuredRegionLeft >= Math.max(minimumWidth, 0)
  ) {
    return {
      left: (measuredRegionLeft - canvasRect.left) / canvasRect.width,
      top: 0,
      width: (measuredRegionRight - measuredRegionLeft) / canvasRect.width,
      height: 1,
    };
  }

  const inset = clamp(horizontalInset, 0, 0.499);
  const insetCanvasRegion = {
    left: canvasRect.left + canvasRect.width * inset,
    top: canvasRect.top,
    right: canvasRect.left + canvasRect.width * (1 - inset),
    bottom: canvasBottom,
  };
  const safeClearance = Math.max(clearance, 0);
  const contentOverlapsCanvas = overlapsRegion(topBoundaryRect, {
    left: canvasRect.left,
    top: canvasRect.top,
    right: canvasRect.left + canvasRect.width,
    bottom: canvasBottom,
  });
  const sideRegionLeft = clamp(
    topBoundaryRect.left + topBoundaryRect.width + safeClearance,
    insetCanvasRegion.left,
    insetCanvasRegion.right,
  );
  const hasViableSideRegion =
    contentOverlapsCanvas &&
    insetCanvasRegion.right - sideRegionLeft >= Math.max(minimumWidth, 0);
  const canvasRegion = hasViableSideRegion
    ? { ...insetCanvasRegion, left: sideRegionLeft }
    : insetCanvasRegion;
  const topOverlaps =
    !hasViableSideRegion && overlapsRegion(topBoundaryRect, canvasRegion);
  const bottomOverlaps =
    !hasViableSideRegion && overlapsRegion(bottomBoundaryRect, canvasRegion);
  if (!hasViableSideRegion && !topOverlaps && !bottomOverlaps) return undefined;

  const requestedTop = topOverlaps
    ? topBoundaryRect.top + topBoundaryRect.height + safeClearance
    : canvasRect.top;
  const requestedBottom = bottomOverlaps
    ? bottomBoundaryRect.top - safeClearance
    : canvasBottom;
  const frame = enforceMinimumHeight(
    clamp(requestedTop, canvasRect.top, canvasBottom),
    clamp(requestedBottom, canvasRect.top, canvasBottom),
    canvasRect.top,
    canvasBottom,
    minimumHeight,
  );

  return {
    left: (canvasRegion.left - canvasRect.left) / canvasRect.width,
    top: (frame.top - canvasRect.top) / canvasRect.height,
    width: (canvasRegion.right - canvasRegion.left) / canvasRect.width,
    height: (frame.bottom - frame.top) / canvasRect.height,
  };
}

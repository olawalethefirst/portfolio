import { estimatePrismHomeHeight } from "../../stage/prism-home-frame";

export const PRISM_PORTRAIT_SPREAD_FACTOR = 1.2;

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function calculatePrismPortraitSpread({
  availableRect,
  editorialHeight,
  controlsHeight,
  gap,
}: {
  availableRect: Rect;
  editorialHeight: number;
  controlsHeight: number;
  gap: number;
}): { ok: true; groupHeight: number } | { ok: false; remainingHeight: number } {
  const remainingHeight = availableRect.height - editorialHeight - controlsHeight - 2 * gap;
  if (remainingHeight <= 0 || availableRect.width <= 0) {
    return { ok: false, remainingHeight };
  }
  const width = availableRect.width * 0.9;
  const height = Math.min(remainingHeight, PRISM_PORTRAIT_SPREAD_FACTOR * estimatePrismHomeHeight(width));
  const groupHeight = editorialHeight + controlsHeight + 2 * gap + height;
  return { ok: true, groupHeight };
}

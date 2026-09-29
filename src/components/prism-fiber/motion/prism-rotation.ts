import {
  PRISM_STATE_TARGETS,
  type PrismState,
} from "../state/prism-state";

const RADIANS_TO_DEGREES = 180 / Math.PI;

export interface PrismPresentationTarget {
  readonly state: PrismState;
  readonly viewAzimuthYRad: number;
}

export function resolvePrismRotationYDeg({
  state,
  viewAzimuthYRad,
}: PrismPresentationTarget): number {
  return (
    PRISM_STATE_TARGETS[state].prismRotationYDeg +
    viewAzimuthYRad * RADIANS_TO_DEGREES
  );
}

export function nearestEquivalentAngleRad(
  currentAngleRad: number,
  targetAngleRad: number,
): number {
  const shortestDelta = Math.atan2(
    Math.sin(targetAngleRad - currentAngleRad),
    Math.cos(targetAngleRad - currentAngleRad),
  );

  return currentAngleRad + shortestDelta;
}

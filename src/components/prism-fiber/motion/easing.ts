import { MathUtils } from "three";

export function easeInOutCubic(value: number): number {
  const progress = MathUtils.clamp(value, 0, 1);
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function easeInOutSine(value: number): number {
  const progress = MathUtils.clamp(value, 0, 1);
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

export function easeOutCubic(value: number): number {
  const progress = MathUtils.clamp(value, 0, 1);
  return 1 - Math.pow(1 - progress, 3);
}

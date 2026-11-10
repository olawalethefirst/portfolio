import { describe, expect, it } from "vitest";

import {
  nearestEquivalentAngleRad,
  resolvePrismRotationYDeg,
  type PrismPresentationTarget,
} from "./prism-rotation";

function target(
  state: PrismPresentationTarget["state"],
  viewAzimuthYRad = 0,
): PrismPresentationTarget {
  return { state, viewAzimuthYRad };
}

describe("prism presentation rotation", () => {
  it("preserves canonical state angles in the centered view frame", () => {
    expect(resolvePrismRotationYDeg(target("idea"))).toBe(155);
    expect(resolvePrismRotationYDeg(target("iterate"))).toBe(85);
    expect(resolvePrismRotationYDeg(target("solution"))).toBe(120);
  });

  it("resolves state angles in positive and negative sampled view frames", () => {
    expect(
      resolvePrismRotationYDeg(target("solution", Math.PI / 6)),
    ).toBeCloseTo(150);
    expect(
      resolvePrismRotationYDeg(target("solution", -Math.PI / 4)),
    ).toBeCloseTo(75);
  });

  it("chooses the nearest equivalent angle across the wrap boundary", () => {
    const degrees = (value: number) => value * (180 / Math.PI);

    expect(
      degrees(nearestEquivalentAngleRad(350 * (Math.PI / 180), 10 * (Math.PI / 180))),
    ).toBeCloseTo(370);
    expect(
      degrees(nearestEquivalentAngleRad(10 * (Math.PI / 180), 350 * (Math.PI / 180))),
    ).toBeCloseTo(-10);
  });
});

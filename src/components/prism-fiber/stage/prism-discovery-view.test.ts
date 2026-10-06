import { describe, expect, it } from "vitest";

import { calculatePrismDiscoveryDistance, calculatePrismDiscoveryOffsetX } from "./prism-discovery-view";

describe("calculatePrismDiscoveryOffsetX", () => {
  it.each([
    [0, -0.25], [0.25, -0.1875], [0.5, -0.125], [0.75, -0.0625], [1, 0],
    [-1, -0.25], [2, 0], [Number.NaN, -0.25],
    [Number.POSITIVE_INFINITY, -0.25],
  ])("maps progress %s to horizontal offset %s", (progress, expected) => {
    expect(calculatePrismDiscoveryOffsetX(-0.25, progress)).toBeCloseTo(expected);
  });
});

describe("calculatePrismDiscoveryDistance", () => {
  it("maps normalized progress between the fitted home and discovery distances", () => {
    const discoveryDistance = calculatePrismDiscoveryDistance(3, 1);

    expect(calculatePrismDiscoveryDistance(3, 0)).toBe(3);
    expect(discoveryDistance).toBeCloseTo(1.5);
    expect(calculatePrismDiscoveryDistance(3, 0.5)).toBeCloseTo(
      (3 + discoveryDistance) / 2,
    );
  });

  it("clamps finite progress and treats non-finite progress as the home view", () => {
    const discoveryDistance = calculatePrismDiscoveryDistance(3, 1);

    expect(calculatePrismDiscoveryDistance(3, -1)).toBe(3);
    expect(calculatePrismDiscoveryDistance(3, 2)).toBe(discoveryDistance);
    expect(calculatePrismDiscoveryDistance(3, Number.NaN)).toBe(3);
    expect(calculatePrismDiscoveryDistance(3, Number.POSITIVE_INFINITY)).toBe(
      3,
    );
  });
});

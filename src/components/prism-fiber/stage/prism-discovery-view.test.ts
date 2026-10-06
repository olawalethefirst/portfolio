import { describe, expect, it } from "vitest";

import { calculatePrismDiscoveryDistance } from "./prism-discovery-view";

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

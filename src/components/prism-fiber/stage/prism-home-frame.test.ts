import { describe, expect, it } from "vitest";

import {
  calculatePrismHomeView,
  type PrismHomeFrame,
} from "./prism-home-frame";

describe("calculatePrismHomeView", () => {
  it("fits the Prism uniformly inside a normalized home frame", () => {
    const frame: PrismHomeFrame = {
      left: 0.05,
      top: 0.4,
      width: 0.9,
      height: 0.5,
    };

    const view = calculatePrismHomeView(frame, 9 / 16);
    const halfHeight = view.distance * Math.tan((50 * Math.PI) / 360);
    const projectedWidth = 1.2 / (halfHeight * (9 / 16) * 2);
    const projectedHeight = 1.2 / (halfHeight * 2);

    expect(projectedWidth).toBeLessThanOrEqual(frame.width * 0.9);
    expect(projectedHeight).toBeLessThanOrEqual(frame.height * 0.9);
    expect(view.viewOffsetX).toBeCloseTo(0);
    expect(view.viewOffsetY).toBeCloseTo(-0.15);
  });

  it("clamps an over-range frame before calculating the view", () => {
    const view = calculatePrismHomeView(
      { left: -1, top: 0.4, width: 3, height: 2 },
      1,
    );

    expect(view.frame).toEqual({ left: 0, top: 0.4, width: 1, height: 0.6 });
  });
});

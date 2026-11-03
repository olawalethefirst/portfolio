import { describe, expect, it } from "vitest";

import { measurePrismHomeFrame } from "./prism-home-frame-measurement";

const CLEARANCE = 16;
const MINIMUM_HEIGHT = 176;
const MINIMUM_WIDTH = 320;

describe("measurePrismHomeFrame", () => {
  it("normalizes a portrait allocation without minimum expansion or duplicate insets", () => {
    expect(measurePrismHomeFrame({
      canvasRect: { left: 10, top: 20, width: 400, height: 800 },
      portraitSlotRect: { left: 50, top: 100, width: 300, height: 400 },
      topBoundaryRect: { left: 50, top: 100, width: 300, height: 84 },
      bottomBoundaryRect: { left: 50, top: 304, width: 300, height: 100 },
      clearance: CLEARANCE, minimumHeight: MINIMUM_HEIGHT, minimumWidth: MINIMUM_WIDTH,
    })).toEqual({ left: 40 / 400, top: 80 / 800, width: 300 / 400, height: 400 / 800 });
  });
  it("maps an explicit right-column region into the full Canvas", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 900, top: 680, width: 420, height: 104 },
      canvasRect: { left: 0, top: 0, width: 1600, height: 800 },
      clearance: CLEARANCE,
      initialRegionRect: { left: 656, top: 48, width: 704, height: 704 },
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 208, top: 200, width: 420, height: 300 },
    });

    expect(frame).toEqual({
      height: 1,
      left: 656 / 1600,
      top: 0,
      width: 704 / 1600,
    });
  });

  it("falls back to stacked framing when the explicit region is too narrow", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 16, top: 680, width: 768, height: 104 },
      canvasRect: { left: 0, top: 0, width: 800, height: 800 },
      clearance: CLEARANCE,
      initialRegionRect: { left: 560, top: 48, width: 200, height: 704 },
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 16, top: 16, width: 500, height: 184 },
    });

    expect(frame?.left).toBeCloseTo(0.05);
    expect(frame?.top).toBeCloseTo(0.27);
    expect(frame?.width).toBeCloseTo(0.9);
    expect(frame?.height).toBeCloseTo(0.56);
  });

  it("derives a full-height side frame from the measured content edge", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 640, top: 680, width: 500, height: 104 },
      canvasRect: { left: 0, top: 0, width: 1200, height: 800 },
      clearance: CLEARANCE,
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 48, top: 200, width: 420, height: 300 },
    });

    expect(frame?.left).toBeCloseTo(484 / 1200);
    expect(frame?.top).toBe(0);
    expect(frame?.width).toBeCloseTo(656 / 1200);
    expect(frame?.height).toBe(1);
  });

  it("does not let controls change the side frame", () => {
    const commonMeasurement = {
      canvasRect: { left: 0, top: 0, width: 1200, height: 800 },
      clearance: CLEARANCE,
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 48, top: 200, width: 420, height: 300 },
    };

    const highControlsFrame = measurePrismHomeFrame({
      ...commonMeasurement,
      bottomBoundaryRect: { left: 640, top: 520, width: 500, height: 104 },
    });
    const lowControlsFrame = measurePrismHomeFrame({
      ...commonMeasurement,
      bottomBoundaryRect: { left: 640, top: 680, width: 500, height: 104 },
    });

    expect(highControlsFrame).toEqual(lowControlsFrame);
  });

  it("retains stacked framing when the region beside content is too narrow", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 16, top: 680, width: 768, height: 104 },
      canvasRect: { left: 0, top: 0, width: 800, height: 800 },
      clearance: CLEARANCE,
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 16, top: 16, width: 500, height: 184 },
    });

    expect(frame?.left).toBeCloseTo(0.05);
    expect(frame?.top).toBeCloseTo(0.27);
    expect(frame?.width).toBeCloseTo(0.9);
    expect(frame?.height).toBeCloseTo(0.56);
  });

  it("derives the home frame between overlapping top and bottom UI", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 16, top: 680, width: 368, height: 104 },
      canvasRect: { left: 0, top: 0, width: 400, height: 800 },
      clearance: CLEARANCE,
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 16, top: 16, width: 368, height: 184 },
    });

    expect(frame?.left).toBeCloseTo(0.05);
    expect(frame?.top).toBeCloseTo(0.27);
    expect(frame?.width).toBeCloseTo(0.9);
    expect(frame?.height).toBeCloseTo(0.56);
  });

  it("expands a short gap to the minimum frame around its midpoint", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 0, top: 350, width: 400, height: 100 },
      canvasRect: { left: 0, top: 0, width: 400, height: 600 },
      clearance: CLEARANCE,
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 0, top: 0, width: 400, height: 300 },
    });

    expect(frame?.top).toBeCloseTo(237 / 600);
    expect(frame?.height).toBeCloseTo(176 / 600);
  });

  it("clamps a minimum frame to the Canvas at an edge", () => {
    const frame = measurePrismHomeFrame({
      bottomBoundaryRect: { left: 0, top: 50, width: 400, height: 100 },
      canvasRect: { left: 0, top: 100, width: 400, height: 200 },
      clearance: CLEARANCE,
      minimumHeight: MINIMUM_HEIGHT,
      minimumWidth: MINIMUM_WIDTH,
      topBoundaryRect: { left: 0, top: 100, width: 400, height: 20 },
    });

    expect(frame?.top).toBe(0);
    expect(frame?.height).toBeCloseTo(0.88);
  });

  it("ignores side-by-side UI that does not occlude the Canvas", () => {
    expect(
      measurePrismHomeFrame({
        bottomBoundaryRect: { left: 0, top: 500, width: 300, height: 100 },
        canvasRect: { left: 400, top: 100, width: 600, height: 600 },
        clearance: CLEARANCE,
        minimumHeight: MINIMUM_HEIGHT,
        minimumWidth: MINIMUM_WIDTH,
        topBoundaryRect: { left: 0, top: 100, width: 300, height: 400 },
      }),
    ).toBeUndefined();
  });

  it("returns no frame for a zero-size Canvas", () => {
    expect(
      measurePrismHomeFrame({
        bottomBoundaryRect: { left: 0, top: 0, width: 100, height: 20 },
        canvasRect: { left: 0, top: 0, width: 0, height: 0 },
        clearance: CLEARANCE,
        minimumHeight: MINIMUM_HEIGHT,
        minimumWidth: MINIMUM_WIDTH,
        topBoundaryRect: { left: 0, top: 0, width: 100, height: 20 },
      }),
    ).toBeUndefined();
  });
});

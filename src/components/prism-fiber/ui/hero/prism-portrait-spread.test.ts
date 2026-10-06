import { describe, expect, it } from "vitest";
import { calculatePrismPortraitSpread } from "./prism-portrait-spread";

describe("portrait Prism spread", () => {
  const input = {
    availableRect: { left: 16, top: 16, width: 358, height: 812 },
    editorialHeight: 180, controlsHeight: 100, gap: 16,
  };

  it("caps spread at 1.2 times width-based home height and centers the group", () => {
    const result = calculatePrismPortraitSpread(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.groupHeight).toBeCloseTo(659.976);
    const taller = calculatePrismPortraitSpread({ ...input, availableRect: { ...input.availableRect, height: 1000 } });
    expect(taller.ok).toBe(true);
    if (taller.ok) {
      expect(taller.groupHeight).toBe(result.groupHeight);
    }
  });

  it("uses positive remaining height without minimum expansion", () => {
    const result = calculatePrismPortraitSpread({ ...input, availableRect: { ...input.availableRect, height: 400 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.groupHeight).toBe(400);
    }
  });

  it("reports impossible content budgets without repairing them", () => {
    expect(calculatePrismPortraitSpread({ ...input, editorialHeight: 700 })).toEqual({ ok: false, remainingHeight: -20 });
  });
});

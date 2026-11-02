import { act, render } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismDiscoveryTarget } from "./usePrismDiscoveryScroll";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", () => ({
  useReducedMotion: () => motionPreference.reduced,
}));

import {
  calculatePrismDiscoveryProgress,
  usePrismDiscoveryScroll,
} from "./usePrismDiscoveryScroll";

function ScrollHarness({
  prismRef,
}: {
  prismRef: RefObject<PrismDiscoveryTarget | null>;
}) {
  const originRef = usePrismDiscoveryScroll(prismRef);

  return <div ref={originRef} data-testid="scroll-origin" />;
}

describe("calculatePrismDiscoveryProgress", () => {
  it("maps one viewport of route-relative travel and clamps either side", () => {
    expect(calculatePrismDiscoveryProgress(100, 200, 800)).toBe(0);
    expect(calculatePrismDiscoveryProgress(600, 200, 800)).toBe(0.5);
    expect(calculatePrismDiscoveryProgress(1200, 200, 800)).toBe(1);
  });

  it("returns the home view when viewport geometry is unavailable", () => {
    expect(calculatePrismDiscoveryProgress(600, 200, 0)).toBe(0);
  });
});

describe("usePrismDiscoveryScroll", () => {
  beforeEach(() => {
    motionPreference.reduced = false;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 200,
      writable: true,
    });
  });

  it("streams route-relative progress to the Prism without React state", () => {
    const setDiscoveryProgress = vi.fn();
    const prismRef = createRef<PrismDiscoveryTarget>();
    prismRef.current = { setDiscoveryProgress };

    const { getByTestId } = render(<ScrollHarness prismRef={prismRef} />);
    vi.spyOn(getByTestId("scroll-origin"), "getBoundingClientRect").mockReturnValue(
      { top: 0 } as DOMRect,
    );

    act(() => window.dispatchEvent(new Event("resize")));
    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(0);

    window.scrollY = 600;
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(0.5);

    window.scrollY = 1200;
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(1);
  });

  it("holds the home view while reduced motion is active", () => {
    motionPreference.reduced = true;
    const setDiscoveryProgress = vi.fn();
    const prismRef = createRef<PrismDiscoveryTarget>();
    prismRef.current = { setDiscoveryProgress };

    render(<ScrollHarness prismRef={prismRef} />);

    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(0);

    window.scrollY = 1000;
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(0);
  });

  it("reacts to reduced-motion changes at the current scroll position", () => {
    const setDiscoveryProgress = vi.fn();
    const prismRef = createRef<PrismDiscoveryTarget>();
    prismRef.current = { setDiscoveryProgress };

    const { getByTestId, rerender } = render(
      <ScrollHarness prismRef={prismRef} />,
    );
    vi.spyOn(getByTestId("scroll-origin"), "getBoundingClientRect").mockReturnValue(
      { top: -800 } as DOMRect,
    );
    window.scrollY = 1000;

    motionPreference.reduced = true;
    rerender(<ScrollHarness prismRef={prismRef} />);
    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(0);

    motionPreference.reduced = false;
    rerender(<ScrollHarness prismRef={prismRef} />);
    expect(setDiscoveryProgress).toHaveBeenLastCalledWith(1);
  });
});

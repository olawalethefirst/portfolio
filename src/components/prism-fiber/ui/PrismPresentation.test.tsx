import { fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PrismHandle,
  PrismProps,
  PrismViewState,
} from "../Prism";
import type { HeroControlPanelProps } from "../../ui/hero-control-panel";

const prismRecentre = vi.hoisted(() => vi.fn());

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    animate: vi.fn(() => ({ stop: vi.fn() })),
    useReducedMotion: () => false,
  };
});

vi.mock("../Prism", () => ({
  Prism: forwardRef<PrismHandle, PrismProps>(function PrismMock(
    { onViewStateChange, state },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ recentreView: prismRecentre }));

    const exploredView: PrismViewState = {
      hasEnteredZoom: true,
      hasRotationDrifted: true,
    };

    return (
      <div data-prism-state={state} data-testid="prism-stage">
        <button onClick={() => onViewStateChange?.(exploredView)}>
          Enter manual view
        </button>
      </div>
    );
  }),
}));

vi.mock("../../ui/hero-control-panel", () => ({
  HeroControlPanel: ({
    activeSegment,
    hasEnteredZoom,
    hasRotationDrifted,
    isAutoplayRunning,
    onAutoplayToggle,
    onRecentre,
    onSegmentSelect,
  }: HeroControlPanelProps) => (
    <div
      data-active-segment={activeSegment}
      data-autoplay-running={String(isAutoplayRunning)}
      data-entered-zoom={String(hasEnteredZoom)}
      data-rotation-drifted={String(hasRotationDrifted)}
      data-testid="hero-controls"
    >
      <button onClick={() => onSegmentSelect("solution")}>Select solution</button>
      <button onClick={onAutoplayToggle}>Toggle autoplay</button>
      <button onClick={onRecentre}>Recentre view</button>
    </div>
  ),
}));

import { PrismPresentation } from "./PrismPresentation";

describe("PrismPresentation", () => {
  it("owns the named state, viewport presentation, and hero controls", () => {
    render(<PrismPresentation initialState="iterate" />);

    const presentation = screen.getByRole("main");
    const controls = screen.getByTestId("hero-controls");
    expect(presentation.getAttribute("data-theme")).toBe("plum");
    expect(presentation.getAttribute("data-mode")).toBe("dark");
    expect(presentation.className).toContain("h-dvh");
    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "iterate",
    );
    expect(controls.getAttribute("data-active-segment")).toBe("iterate");

    fireEvent.click(screen.getByRole("button", { name: "Select solution" }));
    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "solution",
    );
    expect(controls.getAttribute("data-active-segment")).toBe("solution");
  });

  it("pauses autoplay when camera exploration begins and forwards recentre", () => {
    render(<PrismPresentation />);

    fireEvent.click(screen.getByRole("button", { name: "Enter manual view" }));

    const controls = screen.getByTestId("hero-controls");
    expect(controls.getAttribute("data-autoplay-running")).toBe("false");
    expect(controls.getAttribute("data-entered-zoom")).toBe("true");
    expect(controls.getAttribute("data-rotation-drifted")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Recentre view" }));
    expect(prismRecentre).toHaveBeenCalled();
  });

  it("contains no legacy fullscreen mode controls", () => {
    render(<PrismPresentation />);

    expect(
      screen.queryByRole("button", { name: /fullscreen/i }),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Drag to spin · scroll to zoom")).toBeTruthy();
  });
});

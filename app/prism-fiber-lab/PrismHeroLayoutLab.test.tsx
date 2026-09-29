import { fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PrismHandle,
  PrismProps,
} from "@/src/components/prism-fiber/Prism";
import type { HeroControlPanelProps } from "@/src/components/ui/hero-control-panel";

const prismRecentre = vi.hoisted(() => vi.fn());

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    animate: vi.fn(() => ({ stop: vi.fn() })),
    useReducedMotion: () => false,
  };
});

vi.mock("@/src/components/prism-fiber/Prism", () => ({
  Prism: forwardRef<PrismHandle, PrismProps>(function PrismMock(
    { onInteractionStart, state },
    ref,
  ) {
    const [marker, setMarker] = useState(0);

    useImperativeHandle(ref, () => ({ recentreView: prismRecentre }));

    return (
      <div data-prism-state={state} data-testid="prism-stage">
        <button onClick={() => setMarker((value) => value + 1)}>
          Prism marker {marker}
        </button>
        <button onClick={onInteractionStart}>
          Enter manual view
        </button>
      </div>
    );
  }),
}));

vi.mock("@/src/components/ui/hero-control-panel", () => ({
  HeroControlPanel: ({
    activeSegment,
    isAutoplayRunning,
    onRecentre,
    onSegmentSelect,
  }: HeroControlPanelProps) => (
    <div
      data-autoplay-running={String(isAutoplayRunning)}
      data-testid="hero-controls"
    >
      <span>Active phase: {activeSegment}</span>
      <button onClick={() => onSegmentSelect("idea")}>Idea</button>
      <button onClick={onRecentre}>Recentre view</button>
    </div>
  ),
}));

import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";

describe("PrismHeroLayoutLab", () => {
  it("presents the complete representative hero composition", () => {
    render(<PrismHeroLayoutLab />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Ideas into products.",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Product delivery")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Work" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hire" })).toBeTruthy();
    expect(screen.getByTestId("hero-controls")).toBeTruthy();
    expect(screen.getAllByTestId("prism-stage")).toHaveLength(1);
  });

  it("retains the Prism instance and semantic state through ordinary rerenders", () => {
    const { rerender } = render(<PrismHeroLayoutLab />);

    fireEvent.click(screen.getByRole("button", { name: "Prism marker 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Idea" }));
    rerender(<PrismHeroLayoutLab />);

    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "idea",
    );
    expect(
      screen.getByText("Align user needs, business goals, and technical reality."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prism marker 1" })).toBeTruthy();
    expect(screen.getAllByTestId("prism-stage")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Two column" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Three column" })).toBeNull();
  });

  it("retains manual-view suspension and recentre behavior", () => {
    render(<PrismHeroLayoutLab />);

    fireEvent.click(screen.getByRole("button", { name: "Enter manual view" }));

    const controls = screen.getByTestId("hero-controls");
    expect(controls.getAttribute("data-autoplay-running")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Recentre view" }));
    expect(prismRecentre).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /fullscreen/i })).toBeNull();
  });
});

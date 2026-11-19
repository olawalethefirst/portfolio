import { act, fireEvent, render, screen } from "@testing-library/react";
import { motionValue } from "motion/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { HeroControlPanel } from "./HeroControlPanel";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("HeroControlPanel", () => {
  it("presents labeled outline actions before progress and primary state tabs", () => {
    const onAutoplayToggle = vi.fn();
    const onRealign = vi.fn();
    const onSegmentSelect = vi.fn();

    render(
      <HeroControlPanel
        activeSegment="idea"
        autoplayProgress={motionValue(42)}
        canAutoplay
        isAutoplayRunning
        onAutoplayToggle={onAutoplayToggle}
        onRealign={onRealign}
        onSegmentSelect={onSegmentSelect}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /iterate/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pause autoplay" }));
    fireEvent.click(screen.getByRole("button", { name: "Realign view" }));

    expect(onSegmentSelect).toHaveBeenCalledWith("iterate");
    expect(onAutoplayToggle).toHaveBeenCalledTimes(1);
    expect(onRealign).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause autoplay" }).textContent).toContain(
      "Pause",
    );
    expect(screen.getByRole("button", { name: "Realign view" }).textContent).toContain(
      "Realign",
    );

    expect(
      screen.getByRole("progressbar", { name: "Autoplay progress" }),
    ).toBeTruthy();
  });

  it("labels the stopped autoplay action as Play", () => {
    render(
      <HeroControlPanel
        activeSegment="idea"
        autoplayProgress={motionValue(42)}
        canAutoplay
        isAutoplayRunning={false}
        onAutoplayToggle={vi.fn()}
        onRealign={vi.fn()}
        onSegmentSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Play autoplay" }).textContent,
    ).toContain("Play");
  });

  it("disables autoplay when motion preferences make it unavailable", () => {
    render(
      <HeroControlPanel
        activeSegment="solution"
        autoplayProgress={motionValue(0)}
        canAutoplay={false}
        isAutoplayRunning={false}
        onAutoplayToggle={vi.fn()}
        onRealign={vi.fn()}
        onSegmentSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Play autoplay" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  describe("autoplay progress", () => {
    const panel = (progress: ReturnType<typeof motionValue<number>>, running: boolean) => (
      <HeroControlPanel
        activeSegment="idea"
        autoplayProgress={progress}
        canAutoplay
        isAutoplayRunning={running}
        onAutoplayToggle={vi.fn()}
        onRealign={vi.fn()}
        onSegmentSelect={vi.fn()}
      />
    );
    const value = () =>
      screen.getByRole("progressbar", { name: "Autoplay progress" }).getAttribute("aria-valuenow");

    it("shows the motion value while autoplay runs and follows its changes", () => {
      const progress = motionValue(42);
      render(panel(progress, true));
      expect(value()).toBe("42");
      act(() => progress.set(77));
      expect(value()).toBe("77");
    });

    it("shows no progress while autoplay is stopped, then resumes from the live value", () => {
      const progress = motionValue(42);
      const { rerender } = render(panel(progress, false));
      expect(value()).toBe("0");
      act(() => progress.set(60));
      expect(value()).toBe("0");
      rerender(panel(progress, true));
      expect(value()).toBe("60");
    });
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { motionValue } from "motion/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { HeroControlPanel } from "./HeroControlPanel";
import { HeroControlPanelPreview } from "./HeroControlPanelPreview";

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
    const onRecentre = vi.fn();
    const onSegmentSelect = vi.fn();

    render(
      <HeroControlPanel
        activeSegment="idea"
        autoplayProgress={motionValue(42)}
        canAutoplay
        isAutoplayRunning
        onAutoplayToggle={onAutoplayToggle}
        onRecentre={onRecentre}
        onSegmentSelect={onSegmentSelect}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /iterate/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pause autoplay" }));
    fireEvent.click(screen.getByRole("button", { name: "Recentre view" }));

    expect(onSegmentSelect).toHaveBeenCalledWith("iterate");
    expect(onAutoplayToggle).toHaveBeenCalledTimes(1);
    expect(onRecentre).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause autoplay" }).textContent).toContain(
      "Pause",
    );
    expect(screen.getByRole("button", { name: "Recentre view" }).textContent).toContain(
      "Recenter",
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
        onRecentre={vi.fn()}
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
        onRecentre={vi.fn()}
        onSegmentSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Play autoplay" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});

describe("HeroControlPanelPreview", () => {
  it("begins from the canonical Solution state", () => {
    render(<HeroControlPanelPreview />);

    expect(
      screen
        .getByRole("tab", { name: /solution/i })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});

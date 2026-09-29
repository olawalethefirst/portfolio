import { fireEvent, render, screen } from "@testing-library/react";
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
    const onRecentre = vi.fn();
    const onSegmentSelect = vi.fn();

    render(
      <HeroControlPanel
        activeSegment="idea"
        autoplayProgress={motionValue(42)}
        hasEnteredZoom={false}
        hasRotationDrifted={false}
        isAutoplayRunning
        isVisible
        onAutoplayToggle={onAutoplayToggle}
        onRecentre={onRecentre}
        onSegmentSelect={onSegmentSelect}
        showPortfolioActions={false}
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

    const panel = screen.getByTestId("hero-controls");
    const rows = Array.from(
      panel.querySelectorAll("[data-control-row]"),
      (row) => row.getAttribute("data-control-row"),
    );
    const progress = screen.getByRole("progressbar", {
      name: "Autoplay progress",
    });
    const actionButtons = [
      screen.getByRole("button", { name: "Pause autoplay" }),
      screen.getByRole("button", { name: "Recentre view" }),
    ];

    expect(rows).toEqual(["actions", "progress", "states"]);
    expect(panel.querySelector(".tabs")).toBeTruthy();
    expect(panel.querySelector(".tabs--secondary")).toBeNull();
    expect(
      actionButtons.every((button) => button.className.includes("button--outline")),
    ).toBe(true);
    expect(progress.className).toContain("-translate-y-0.5");
    expect(screen.queryByText("Explore")).toBeNull();
    expect(screen.queryByText("Hire")).toBeNull();
  });

  it("labels the stopped autoplay action as Play", () => {
    render(
      <HeroControlPanel
        activeSegment="idea"
        autoplayProgress={motionValue(42)}
        hasEnteredZoom={false}
        hasRotationDrifted={false}
        isAutoplayRunning={false}
        isVisible
        onAutoplayToggle={vi.fn()}
        onRecentre={vi.fn()}
        onSegmentSelect={vi.fn()}
        showPortfolioActions={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Play autoplay" }).textContent,
    ).toContain("Play");
  });
});

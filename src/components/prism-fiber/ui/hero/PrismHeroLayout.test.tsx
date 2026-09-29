import { fireEvent, render, screen } from "@testing-library/react";
import { forwardRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PrismHandle,
  PrismProps,
} from "../../Prism";
import type { HeroControlPanelProps } from "../../../ui/hero-control-panel";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    animate: vi.fn(() => ({ stop: vi.fn() })),
    useReducedMotion: () => false,
  };
});

vi.mock("../../Prism", () => ({
  Prism: forwardRef<PrismHandle, PrismProps>(function PrismMock({ state }, _ref) {
    void _ref;
    return <div data-prism-state={state} data-testid="prism-stage" />;
  }),
}));

vi.mock("../../../ui/hero-control-panel", () => ({
  HeroControlPanel: ({
    onSegmentSelect,
    showPortfolioActions,
  }: HeroControlPanelProps) => (
    <div data-show-portfolio-actions={String(showPortfolioActions)}>
      <button onClick={() => onSegmentSelect("solution")}>Solution</button>
    </div>
  ),
}));

import { PrismHeroLayout } from "./PrismHeroLayout";

describe("PrismHeroLayout", () => {
  it("keeps one full-hero Canvas behind every responsive composition", () => {
    const { rerender } = render(<PrismHeroLayout layout="two-column" />);

    const hero = screen.getByTestId("prism-hero");
    const contentContainer = screen.getByTestId("prism-content-container");
    const initialRegion = screen.getByTestId("prism-initial-region");
    const canvas = screen.getByTestId("prism-stage").parentElement;
    const content = screen.getByRole("heading", { level: 1 }).parentElement;
    const controls = screen.getByLabelText("Prism controls");

    expect(hero.className).toContain("h-dvh");
    expect(hero.className).not.toContain("max-w-7xl");
    expect(contentContainer.className).toContain("max-w-7xl");
    expect(contentContainer.className).toContain("md:landscape:grid");
    expect(initialRegion.className).toContain("md:landscape:col-start-2");
    expect(hero.className).not.toContain("sm:grid");
    expect(hero.className).not.toContain("sm:landscape:grid");
    expect(canvas?.className).toContain("absolute inset-0");
    expect(canvas?.className).not.toContain("md:landscape:relative");
    expect(canvas?.className).not.toContain("lg:relative");
    expect(content?.className).toContain("absolute inset-x-4 top-4");
    expect(content?.className).toContain("md:landscape:relative");
    expect(content?.className).not.toContain("sm:landscape:relative");
    expect(content?.className).toContain("lg:relative");
    expect(controls.className).toContain("absolute inset-x-4");
    expect(controls.className).toContain(
      "bottom-[max(1rem,env(safe-area-inset-bottom))]",
    );
    expect(controls.className).toContain("items-center");
    expect(controls.className).toContain("justify-end");
    expect(controls.className).not.toContain("md:landscape:relative");
    expect(controls.className).not.toContain("lg:relative");
    expect(controls.className).not.toContain("md:landscape:row-start-2");
    expect(controls.className).not.toContain("md:landscape:right-8");
    expect(controls.className).not.toContain("lg:right-12");
    expect(screen.getByText("Interactive Prism · drag to inspect").parentElement).toBe(
      controls,
    );
    const twoColumnControlClasses = controls.className;

    rerender(<PrismHeroLayout layout="three-column" />);

    const threeColumnControls = screen.getByLabelText("Prism controls");
    expect(threeColumnControls.className).toBe(twoColumnControlClasses);
    expect(threeColumnControls.className).not.toContain("lg:col-start-3");
    expect(
      hero.querySelector('[aria-hidden="true"]'),
    ).toBeNull();
  });

  it("presents one compact state-led editorial flow", () => {
    render(<PrismHeroLayout layout="two-column" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Align user needs, business goals, and technical reality.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Work" }).className,
    ).toContain("button--sm");
    expect(
      screen.getByRole("link", { name: "Hire" }).className,
    ).toContain("button--sm");
    expect(screen.queryByText(/I help teams move/)).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Solution" })
        .parentElement?.getAttribute("data-show-portfolio-actions"),
    ).toBe("false");
  });

  it("uses one state for the Prism and editorial content", () => {
    render(<PrismHeroLayout layout="two-column" />);

    fireEvent.click(screen.getByRole("button", { name: "Solution" }));

    expect(
      screen.getByText("Deliver a coherent product built to evolve."),
    ).toBeTruthy();
    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "solution",
    );
  });
});

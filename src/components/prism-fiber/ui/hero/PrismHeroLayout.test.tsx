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
  HeroControlPanel: ({ onSegmentSelect }: HeroControlPanelProps) => (
    <div>
      <button onClick={() => onSegmentSelect("idea")}>Idea</button>
    </div>
  ),
}));

import { PrismHeroLayout } from "./PrismHeroLayout";

describe("PrismHeroLayout", () => {
  it("renders one interactive prism with its editorial content and controls", () => {
    render(<PrismHeroLayout />);

    expect(screen.getAllByTestId("prism-stage")).toHaveLength(1);
    expect(screen.getByLabelText("Prism controls")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
  });

  it("begins the state-led editorial flow from the solution state", () => {
    render(<PrismHeroLayout />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Deliver a coherent product built to evolve.",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "solution",
    );
    expect(screen.getByRole("link", { name: "Work" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hire" })).toBeTruthy();
  });

  it("uses one state for the Prism and editorial content", () => {
    render(<PrismHeroLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Idea" }));

    expect(
      screen.getByText("Align user needs, business goals, and technical reality."),
    ).toBeTruthy();
    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "idea",
    );
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  createRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PrismHandle,
  PrismProps,
} from "../../Prism";
import type { HeroControlPanelProps } from "../../../ui/hero-control-panel";

const prismSetDiscoveryProgress = vi.hoisted(() => vi.fn());

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    animate: vi.fn(() => ({ stop: vi.fn() })),
    useReducedMotion: () => false,
  };
});

vi.mock("../../Prism", () => ({
  Prism: forwardRef<PrismHandle, PrismProps>(function PrismMock(
    { allowsCameraZoom, state },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      recentreView: vi.fn(),
      setDiscoveryProgress: prismSetDiscoveryProgress,
    }));

    return (
      <div
        data-allows-camera-zoom={String(allowsCameraZoom)}
        data-prism-state={state}
        data-testid="prism-stage"
      />
    );
  }),
}));

vi.mock("../../../ui/hero-control-panel", () => ({
  HeroControlPanel: ({ onSegmentSelect }: HeroControlPanelProps) => (
    <div>
      <button onClick={() => onSegmentSelect("idea")}>Idea</button>
    </div>
  ),
}));

import {
  PrismHeroLayout,
  type PrismHeroLayoutHandle,
} from "./PrismHeroLayout";

import { PRISM_HERO_DEFAULT_CONTENT } from "./prism-hero-content";

describe("PrismHeroLayout", () => {
  it("renders saved live content and uses saved copy when changing stages", () => {
    const content = {
      ...PRISM_HERO_DEFAULT_CONTENT,
      headline: "Saved headline",
      eyebrow: "Saved eyebrow",
      stages: {
        ...PRISM_HERO_DEFAULT_CONTENT.stages,
        idea: { tagline: "Saved idea", description: "Saved idea description" },
        solution: { tagline: "Saved solution", description: "Saved solution description" },
      },
    };
    render(<PrismHeroLayout content={content} />);
    expect(screen.getByRole("heading", { level: 1, name: "Saved headline" })).toBeTruthy();
    expect(screen.getByText("Saved eyebrow")).toBeTruthy();
    expect(screen.getByText("Saved solution description")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Idea" }));
    expect(screen.getByText("Saved idea description")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Saved idea" })).toBeTruthy();
  });
  it("renders one interactive prism with its editorial content and controls", () => {
    render(<PrismHeroLayout content={PRISM_HERO_DEFAULT_CONTENT} />);

    expect(screen.getAllByTestId("prism-stage")).toHaveLength(1);
    expect(screen.getByLabelText("Prism controls")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
  });

  it("begins the state-led editorial flow from the solution state", () => {
    render(<PrismHeroLayout content={PRISM_HERO_DEFAULT_CONTENT} />);

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
    render(<PrismHeroLayout content={PRISM_HERO_DEFAULT_CONTENT} />);

    fireEvent.click(screen.getByRole("button", { name: "Idea" }));

    expect(
      screen.getByText("Align user needs, business goals, and technical reality."),
    ).toBeTruthy();
    expect(screen.getByTestId("prism-stage").getAttribute("data-prism-state")).toBe(
      "idea",
    );
  });

  it("forwards page-owned discovery progress to its persistent Prism", () => {
    const ref = createRef<PrismHeroLayoutHandle>();
    render(<PrismHeroLayout content={PRISM_HERO_DEFAULT_CONTENT} ref={ref} allowsCameraZoom={false} />);

    expect(
      screen.getByTestId("prism-stage").getAttribute("data-allows-camera-zoom"),
    ).toBe("false");

    act(() => ref.current?.setDiscoveryProgress(0.6));
    expect(prismSetDiscoveryProgress).toHaveBeenCalledWith(0.6);
  });
});

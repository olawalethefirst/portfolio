import { render, screen } from "@testing-library/react";
import { createRef, forwardRef, useImperativeHandle } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PrismState } from "./state/prism-state";
import type { PrismHomeFrame } from "./stage/prism-home-frame";

const stageRecentre = vi.hoisted(() => vi.fn());
const stageSetDiscoveryProgress = vi.hoisted(() => vi.fn());

vi.mock("./stage/PrismStage", () => ({
  PrismStage: forwardRef(function PrismStageMock(
    {
      className,
      allowsCameraZoom,
      homeFrame,
      onInteractionStart,
      state,
    }: {
      className?: string;
      allowsCameraZoom?: boolean;
      homeFrame?: PrismHomeFrame;
      onInteractionStart?: () => void;
      state: PrismState;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      recentreView: stageRecentre,
      setDiscoveryProgress: stageSetDiscoveryProgress,
    }));

    return (
      <div
        className={className}
        data-allows-camera-zoom={String(allowsCameraZoom)}
        data-home-frame={JSON.stringify(homeFrame)}
        data-state={state}
        data-testid="stage-state"
      >
        <button
          onClick={onInteractionStart}
        >
          Explore
        </button>
      </div>
    );
  }),
}));

import { Prism, type PrismHandle } from "./Prism";

describe("Prism public API", () => {
  it("accepts a semantic state and delegates presentation to the Stage Layer", () => {
    const homeFrame: PrismHomeFrame = {
      left: 0.05,
      top: 0.4,
      width: 0.9,
      height: 0.5,
    };
    render(
      <Prism
        allowsCameraZoom={false}
        className="embedded"
        homeFrame={homeFrame}
        state="solution"
      />,
    );

    const stage = screen.getByTestId("stage-state");
    expect(stage.getAttribute("data-state")).toBe("solution");
    expect(stage.className).toBe("embedded");
    expect(stage.getAttribute("data-home-frame")).toBe(
      JSON.stringify(homeFrame),
    );
    expect(stage.getAttribute("data-allows-camera-zoom")).toBe("false");
  });

  it("forwards interaction events and the recentre command", () => {
    const onInteractionStart = vi.fn();
    const ref = createRef<PrismHandle>();
    render(
      <Prism
        ref={ref}
        onInteractionStart={onInteractionStart}
        state="idea"
      />,
    );

    screen.getByRole("button", { name: "Explore" }).click();
    expect(onInteractionStart).toHaveBeenCalledTimes(1);

    ref.current?.recentreView();
    expect(stageRecentre).toHaveBeenCalled();

    ref.current?.setDiscoveryProgress(0.75);
    expect(stageSetDiscoveryProgress).toHaveBeenCalledWith(0.75);
  });
});

import { render, screen } from "@testing-library/react";
import { createRef, forwardRef, useImperativeHandle } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PrismState } from "./state/prism-state";
import type { PrismHomeFrame } from "./stage/prism-home-frame";
import type { PrismViewState } from "./stage/PrismStage";

const stageRecentre = vi.hoisted(() => vi.fn());

vi.mock("./stage/PrismStage", () => ({
  PrismStage: forwardRef(function PrismStageMock(
    {
      className,
      homeFrame,
      onViewStateChange,
      state,
    }: {
      className?: string;
      homeFrame?: PrismHomeFrame;
      onViewStateChange?: (viewState: PrismViewState) => void;
      state: PrismState;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ recentreView: stageRecentre }));

    return (
      <div
        className={className}
        data-home-frame={JSON.stringify(homeFrame)}
        data-state={state}
        data-testid="stage-state"
      >
        <button
          onClick={() =>
            onViewStateChange?.({
              hasEnteredZoom: true,
              hasRotationDrifted: true,
            })
          }
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
      <Prism className="embedded" homeFrame={homeFrame} state="solution" />,
    );

    const stage = screen.getByTestId("stage-state");
    expect(stage.getAttribute("data-state")).toBe("solution");
    expect(stage.className).toBe("embedded");
    expect(stage.getAttribute("data-home-frame")).toBe(
      JSON.stringify(homeFrame),
    );
  });

  it("forwards semantic view events and the recentre command", () => {
    const onViewStateChange = vi.fn();
    const ref = createRef<PrismHandle>();
    render(
      <Prism
        ref={ref}
        onViewStateChange={onViewStateChange}
        state="idea"
      />,
    );

    screen.getByRole("button", { name: "Explore" }).click();
    expect(onViewStateChange).toHaveBeenCalledWith({
      hasEnteredZoom: true,
      hasRotationDrifted: true,
    });

    ref.current?.recentreView();
    expect(stageRecentre).toHaveBeenCalled();
  });
});

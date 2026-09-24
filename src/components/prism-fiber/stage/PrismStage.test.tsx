import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  createRef,
  forwardRef,
  useImperativeHandle,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";

import type { PrismState } from "../state/prism-state";

const orbit = vi.hoisted(() => ({
  azimuth: 0,
  reset: vi.fn(),
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({
    children,
    className,
  }: PropsWithChildren<{ className?: string; fallback?: ReactNode }>) => (
    <div className={className} data-testid="canvas">
      {children}
    </div>
  ),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: forwardRef(function OrbitControlsMock(
    props: { onChange?: () => void; onStart?: () => void },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      getAzimuthalAngle: () => orbit.azimuth,
      reset: orbit.reset,
    }));
    return (
      <div data-testid="orbit-controls">
        <button onClick={props.onStart}>Start orbit</button>
        <button onClick={props.onChange}>Change orbit</button>
      </div>
    );
  }),
  PerspectiveCamera: (props: { fov: number; position: [number, number, number] }) => (
    <div
      data-fov={props.fov}
      data-position={props.position.join(",")}
      data-testid="presentation-camera"
    />
  ),
}));

vi.mock("../scene/PrismScene", () => ({
  PrismScene: ({ state }: { state: PrismState }) => (
    <div data-prism-state={state} data-testid="prism-scene" />
  ),
}));

import { PrismStage, type PrismStageHandle } from "./PrismStage";

describe("PrismStage", () => {
  it("fills its parent and forwards semantic state to the scene", () => {
    render(<PrismStage className="test-container" state="solution" />);

    const stage = screen.getByLabelText("Interactive prism stage");
    expect(stage.className).toContain("size-full");
    expect(stage.className).toContain("test-container");
    expect(screen.getByTestId("prism-scene").getAttribute("data-prism-state")).toBe(
      "solution",
    );
  });

  it("owns the presentation camera and orbit controls", () => {
    render(<PrismStage state="idea" />);

    expect(screen.getByTestId("presentation-camera").getAttribute("data-fov")).toBe("50");
    expect(
      screen.getByTestId("presentation-camera").getAttribute("data-position"),
    ).toBe("0,0,3");
    expect(screen.getByTestId("orbit-controls")).toBeTruthy();
  });

  it("reports manual exploration and recentres through a semantic handle", () => {
    const onViewStateChange = vi.fn();
    const ref = createRef<PrismStageHandle>();
    render(
      <PrismStage
        ref={ref}
        onViewStateChange={onViewStateChange}
        state="idea"
      />,
    );

    fireEvent.click(screen.getByText("Start orbit"));
    expect(onViewStateChange).toHaveBeenLastCalledWith({
      hasEnteredZoom: true,
      hasRotationDrifted: false,
    });

    orbit.azimuth = 0.5;
    fireEvent.click(screen.getByText("Change orbit"));
    expect(onViewStateChange).toHaveBeenLastCalledWith({
      hasEnteredZoom: true,
      hasRotationDrifted: true,
    });

    act(() => ref.current?.recentreView());
    expect(orbit.reset).toHaveBeenCalled();
    expect(onViewStateChange).toHaveBeenLastCalledWith({
      hasEnteredZoom: true,
      hasRotationDrifted: false,
    });
  });
});

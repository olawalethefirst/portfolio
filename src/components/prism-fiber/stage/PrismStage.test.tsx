import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  createRef,
  forwardRef,
  useImperativeHandle,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismState } from "../state/prism-state";

const orbit = vi.hoisted(() => ({
  azimuth: 0,
  reset: vi.fn(),
  saveState: vi.fn(),
  target: { set: vi.fn() },
  update: vi.fn(),
}));
const camera = vi.hoisted(() => ({
  clearViewOffset: vi.fn(),
  isPerspectiveCamera: true,
  position: { set: vi.fn() },
  setViewOffset: vi.fn(),
  updateProjectionMatrix: vi.fn(),
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({
    camera: cameraProps,
    children,
    className,
  }: PropsWithChildren<{
    camera?: { fov?: number; position?: [number, number, number] };
    className?: string;
    fallback?: ReactNode;
  }>) => (
    <div
      className={className}
      data-fov={cameraProps?.fov}
      data-position={cameraProps?.position?.join(",")}
      data-testid="canvas"
    >
      {children}
    </div>
  ),
  useThree: (selector: (state: unknown) => unknown) =>
    selector({ camera, size: { height: 200, width: 100 } }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: forwardRef(function OrbitControlsMock(
    props: { onChange?: () => void; onStart?: () => void },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      getAzimuthalAngle: () => orbit.azimuth,
      reset: orbit.reset,
      saveState: orbit.saveState,
      target: orbit.target,
      update: orbit.update,
    }));
    return (
      <div data-testid="orbit-controls">
        <button onClick={props.onStart}>Start orbit</button>
        <button onClick={props.onChange}>Change orbit</button>
      </div>
    );
  }),
}));

vi.mock("../scene/PrismScene", () => ({
  PrismScene: ({ state }: { state: PrismState }) => (
    <div data-prism-state={state} data-testid="prism-scene" />
  ),
}));

import { PrismStage, type PrismStageHandle } from "./PrismStage";

describe("PrismStage", () => {
  beforeEach(() => {
    orbit.azimuth = 0;
    vi.clearAllMocks();
  });

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

    expect(screen.getByTestId("canvas").getAttribute("data-fov")).toBe("50");
    expect(screen.getByTestId("canvas").getAttribute("data-position")).toBe(
      "0,0,3",
    );
    expect(screen.getByTestId("orbit-controls")).toBeTruthy();
  });

  it("uses a home frame to fit and offset the presentation camera", () => {
    render(
      <PrismStage
        homeFrame={{ left: 0.05, top: 0.4, width: 0.9, height: 0.5 }}
        state="idea"
      />,
    );

    expect(camera.setViewOffset).toHaveBeenCalledWith(
      100,
      200,
      expect.closeTo(0),
      expect.closeTo(-30),
      100,
      200,
    );
    expect(camera.position.set).toHaveBeenCalledWith(
      0,
      0,
      expect.any(Number),
    );
    expect(orbit.saveState).toHaveBeenCalled();
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

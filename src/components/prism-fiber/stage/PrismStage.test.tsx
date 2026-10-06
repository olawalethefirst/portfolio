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
import { calculatePrismDiscoveryDistance } from "./prism-discovery-view";

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
  position: { set: vi.fn(), setLength: vi.fn() },
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
    props: {
      enableZoom?: boolean;
      onChange?: () => void;
      onStart?: () => void;
    },
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
      <div
        data-enable-zoom={String(props.enableZoom)}
        data-testid="orbit-controls"
      >
        <button onClick={props.onStart}>Start orbit</button>
        <button onClick={props.onChange}>Change orbit</button>
      </div>
    );
  }),
}));

vi.mock("../scene/PrismScene", () => ({
  PrismScene: ({
    state,
    viewAzimuthYRad,
  }: {
    state: PrismState;
    viewAzimuthYRad?: number;
  }) => (
    <div
      data-prism-state={state}
      data-testid="prism-scene"
      data-view-azimuth-y-rad={viewAzimuthYRad}
    />
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

  it("can reserve zoom for an external presentation input", () => {
    render(<PrismStage allowsCameraZoom={false} state="idea" />);

    expect(
      screen.getByTestId("orbit-controls").getAttribute("data-enable-zoom"),
    ).toBe("false");
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

  it("reports interaction starts and recentres through a semantic handle", () => {
    const onInteractionStart = vi.fn();
    const ref = createRef<PrismStageHandle>();
    render(
      <PrismStage
        ref={ref}
        onInteractionStart={onInteractionStart}
        state="idea"
      />,
    );

    fireEvent.click(screen.getByText("Start orbit"));
    fireEvent.click(screen.getByText("Start orbit"));
    expect(onInteractionStart).toHaveBeenCalledTimes(2);

    act(() => ref.current?.recentreView());
    expect(orbit.reset).toHaveBeenCalled();
  });

  it("applies normalized discovery progress without resetting camera direction", () => {
    const ref = createRef<PrismStageHandle>();
    render(<PrismStage ref={ref} state="idea" />);
    camera.position.setLength.mockClear();

    act(() => ref.current?.setDiscoveryProgress(0.5));
    expect(camera.position.setLength).toHaveBeenLastCalledWith(
      calculatePrismDiscoveryDistance(3, 0.5),
    );

    act(() => ref.current?.setDiscoveryProgress(Number.NaN));
    expect(camera.position.setLength).toHaveBeenLastCalledWith(3);
    expect(camera.position.set).not.toHaveBeenCalledWith(0, 0, 2.475);
  });

  it("reapplies discovery progress when the fitted home view changes", () => {
    const ref = createRef<PrismStageHandle>();
    const { rerender } = render(
      <PrismStage
        ref={ref}
        homeFrame={{ left: 0, top: 0, width: 1, height: 1 }}
        state="idea"
      />,
    );

    act(() => ref.current?.setDiscoveryProgress(1));
    const initialDiscoveryDistance = camera.position.setLength.mock.lastCall?.[0];

    rerender(
      <PrismStage
        ref={ref}
        homeFrame={{ left: 0, top: 0, width: 1, height: 0.25 }}
        state="idea"
      />,
    );

    const resizedDiscoveryDistance = camera.position.set.mock.lastCall?.[2];
    expect(resizedDiscoveryDistance).toBeGreaterThan(initialDiscoveryDistance);
  });

  it("samples and holds the camera azimuth when semantic state changes", () => {
    const ref = createRef<PrismStageHandle>();
    const { rerender } = render(<PrismStage ref={ref} state="idea" />);
    const scene = screen.getByTestId("prism-scene");

    expect(scene.getAttribute("data-view-azimuth-y-rad")).toBe("0");

    orbit.azimuth = 0.5;
    fireEvent.click(screen.getByText("Start orbit"));
    fireEvent.click(screen.getByText("Change orbit"));

    expect(scene.getAttribute("data-view-azimuth-y-rad")).toBe("0");

    rerender(<PrismStage ref={ref} state="solution" />);

    expect(scene.getAttribute("data-prism-state")).toBe("solution");
    expect(scene.getAttribute("data-view-azimuth-y-rad")).toBe("0.5");
    expect(orbit.reset).not.toHaveBeenCalled();

    orbit.azimuth = 0.75;
    fireEvent.click(screen.getByText("Change orbit"));

    expect(scene.getAttribute("data-view-azimuth-y-rad")).toBe("0.5");

    act(() => ref.current?.recentreView());

    expect(scene.getAttribute("data-view-azimuth-y-rad")).toBe("0");
  });
});

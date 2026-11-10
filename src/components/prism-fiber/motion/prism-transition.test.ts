import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import type { MotionChannel } from "./motion-channel";
import type { PrismPresentationTarget } from "./prism-rotation";
import { createPrismTransitionController } from "./prism-transition";
import type { PrismState } from "../state/prism-state";

function createChannel<T>(): MotionChannel<T> & {
  beginTransition: Mock<(target: T) => void>;
  snap: Mock<(target: T) => void>;
  update: Mock<(timelineProgress: number) => void>;
} {
  return {
    beginTransition: vi.fn<(target: T) => void>(),
    snap: vi.fn<(target: T) => void>(),
    update: vi.fn<(timelineProgress: number) => void>(),
  };
}

function createChannels() {
  return {
    prismRotation: createChannel<number>(),
    figurePose: createChannel<PrismState>(),
    monitorOpacity: createChannel<number>(),
  };
}

function presentation(
  state: PrismState,
  viewAzimuthYRad = 0,
): PrismPresentationTarget {
  return { state, viewAzimuthYRad };
}

describe("prism transition controller", () => {
  it("snaps all channels to a named state", () => {
    const channels = createChannels();
    const controller = createPrismTransitionController(channels, 700);

    controller.snap(presentation("iterate"));

    expect(channels.prismRotation.snap).toHaveBeenCalledWith(85);
    expect(channels.figurePose.snap).toHaveBeenCalledWith("iterate");
    expect(channels.monitorOpacity.snap).toHaveBeenCalledWith(0);
  });

  it("advances every channel on one shared timeline", () => {
    const channels = createChannels();
    const controller = createPrismTransitionController(channels, 700);
    controller.snap(presentation("idea"));

    controller.transitionTo(presentation("solution"));
    controller.advance(350);

    expect(channels.prismRotation.beginTransition).toHaveBeenCalledWith(120);
    expect(channels.figurePose.beginTransition).toHaveBeenCalledWith("solution");
    expect(channels.monitorOpacity.beginTransition).toHaveBeenCalledWith(1);
    expect(channels.prismRotation.update).toHaveBeenCalledWith(0.5);
    expect(channels.figurePose.update).toHaveBeenCalledWith(0.5);
    expect(channels.monitorOpacity.update).toHaveBeenCalledWith(0.5);
  });

  it("captures the rendered values again when interrupted", () => {
    const channels = createChannels();
    const controller = createPrismTransitionController(channels, 700);
    controller.snap(presentation("idea"));
    controller.transitionTo(presentation("solution"));
    controller.advance(350);

    controller.transitionTo(presentation("iterate"));

    expect(channels.prismRotation.beginTransition).toHaveBeenLastCalledWith(85);
    expect(channels.figurePose.beginTransition).toHaveBeenLastCalledWith("iterate");
    expect(channels.monitorOpacity.beginTransition).toHaveBeenLastCalledWith(0);
  });

  it("finishes exactly at one and stops updating", () => {
    const channels = createChannels();
    const controller = createPrismTransitionController(channels, 700);
    controller.snap(presentation("idea"));
    controller.transitionTo(presentation("iterate"));

    controller.advance(800);
    controller.advance(100);

    expect(channels.prismRotation.update).toHaveBeenCalledTimes(1);
    expect(channels.prismRotation.update).toHaveBeenCalledWith(1);
    expect(controller.isTransitioning()).toBe(false);
  });

  it("applies the sampled view offset only to prism rotation", () => {
    const channels = createChannels();
    const controller = createPrismTransitionController(channels, 700);

    controller.snap(presentation("idea"));
    controller.transitionTo(presentation("solution", Math.PI / 6));

    expect(channels.prismRotation.beginTransition).toHaveBeenCalledWith(150);
    expect(channels.figurePose.beginTransition).toHaveBeenCalledWith("solution");
    expect(channels.monitorOpacity.beginTransition).toHaveBeenCalledWith(1);
  });

  it("leaves settled pose and opacity channels untouched when only the view frame changes", () => {
    const channels = createChannels();
    const controller = createPrismTransitionController(channels, 700);
    controller.snap(presentation("solution"));
    vi.clearAllMocks();

    controller.transitionTo(presentation("solution", Math.PI / 6));
    controller.advance(350);

    expect(channels.prismRotation.beginTransition).toHaveBeenCalledWith(150);
    expect(channels.prismRotation.update).toHaveBeenCalledWith(0.5);
    expect(channels.figurePose.beginTransition).not.toHaveBeenCalled();
    expect(channels.figurePose.update).not.toHaveBeenCalled();
    expect(channels.monitorOpacity.beginTransition).not.toHaveBeenCalled();
    expect(channels.monitorOpacity.update).not.toHaveBeenCalled();
  });
});

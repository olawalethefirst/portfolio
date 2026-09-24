import type { MotionChannel } from "./motion-channel";
import { PRISM_STATE_TARGETS, type PrismState } from "../state/prism-state";

export interface PrismMotionChannels {
  prismRotation: MotionChannel<number>;
  figurePose: MotionChannel<PrismState>;
  monitorOpacity: MotionChannel<number>;
}

export interface PrismTransitionController {
  snap(state: PrismState): void;
  transitionTo(state: PrismState): void;
  advance(deltaMs: number): void;
  isTransitioning(): boolean;
}

function applyTargets(
  channels: PrismMotionChannels,
  state: PrismState,
  method: "snap" | "beginTransition",
) {
  const targets = PRISM_STATE_TARGETS[state];
  channels.prismRotation[method](targets.prismRotationYDeg);
  channels.figurePose[method](state);
  channels.monitorOpacity[method](targets.monitorOpacity);
}

export function createPrismTransitionController(
  channels: PrismMotionChannels,
  durationMs: number,
): PrismTransitionController {
  const duration = Math.max(0, durationMs);
  let targetState: PrismState | null = null;
  let elapsedMs = 0;
  let transitioning = false;

  const snap = (state: PrismState) => {
    applyTargets(channels, state, "snap");
    targetState = state;
    elapsedMs = 0;
    transitioning = false;
  };

  const advance = (deltaMs: number) => {
    if (!transitioning) return;
    elapsedMs += Math.max(0, deltaMs);
    const progress = duration === 0 ? 1 : Math.min(1, elapsedMs / duration);
    channels.prismRotation.update(progress);
    channels.figurePose.update(progress);
    channels.monitorOpacity.update(progress);
    if (progress === 1) transitioning = false;
  };

  const transitionTo = (state: PrismState) => {
    if (targetState === null) {
      snap(state);
      return;
    }
    if (state === targetState) return;

    applyTargets(channels, state, "beginTransition");
    targetState = state;
    elapsedMs = 0;
    transitioning = true;

    if (duration === 0) advance(0);
  };

  return {
    snap,
    transitionTo,
    advance,
    isTransitioning: () => transitioning,
  };
}

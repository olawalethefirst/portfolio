import type { MotionChannel } from "./motion-channel";
import {
  resolvePrismRotationYDeg,
  type PrismPresentationTarget,
} from "./prism-rotation";
import { PRISM_STATE_TARGETS, type PrismState } from "../state/prism-state";

export interface PrismMotionChannels {
  prismRotation: MotionChannel<number>;
  figurePose: MotionChannel<PrismState>;
  monitorOpacity: MotionChannel<number>;
}

export interface PrismTransitionController {
  snap(target: PrismPresentationTarget): void;
  transitionTo(target: PrismPresentationTarget): void;
  advance(deltaMs: number): void;
  isTransitioning(): boolean;
}

function applyTargets(
  channels: PrismMotionChannels,
  target: PrismPresentationTarget,
  method: "snap" | "beginTransition",
) {
  const stateTargets = PRISM_STATE_TARGETS[target.state];
  channels.prismRotation[method](resolvePrismRotationYDeg(target));
  channels.figurePose[method](target.state);
  channels.monitorOpacity[method](stateTargets.monitorOpacity);
}

function targetsMatch(
  current: PrismPresentationTarget | null,
  next: PrismPresentationTarget,
) {
  return (
    current?.state === next.state &&
    current.viewAzimuthYRad === next.viewAzimuthYRad
  );
}

export function createPrismTransitionController(
  channels: PrismMotionChannels,
  durationMs: number,
): PrismTransitionController {
  const duration = Math.max(0, durationMs);
  let currentTarget: PrismPresentationTarget | null = null;
  let elapsedMs = 0;
  let transitioning = false;
  let animateSemanticChannels = false;

  const snap = (target: PrismPresentationTarget) => {
    applyTargets(channels, target, "snap");
    currentTarget = target;
    elapsedMs = 0;
    transitioning = false;
    animateSemanticChannels = false;
  };

  const advance = (deltaMs: number) => {
    if (!transitioning) return;
    elapsedMs += Math.max(0, deltaMs);
    const progress = duration === 0 ? 1 : Math.min(1, elapsedMs / duration);
    channels.prismRotation.update(progress);
    if (animateSemanticChannels) {
      channels.figurePose.update(progress);
      channels.monitorOpacity.update(progress);
    }
    if (progress === 1) transitioning = false;
  };

  const transitionTo = (target: PrismPresentationTarget) => {
    if (currentTarget === null) {
      snap(target);
      return;
    }
    if (targetsMatch(currentTarget, target)) return;

    const shouldRebaseSemanticChannels =
      transitioning || currentTarget.state !== target.state;
    if (shouldRebaseSemanticChannels) {
      applyTargets(channels, target, "beginTransition");
    } else {
      channels.prismRotation.beginTransition(
        resolvePrismRotationYDeg(target),
      );
    }
    currentTarget = target;
    elapsedMs = 0;
    transitioning = true;
    animateSemanticChannels = shouldRebaseSemanticChannels;

    if (duration === 0) advance(0);
  };

  return {
    snap,
    transitionTo,
    advance,
    isTransitioning: () => transitioning,
  };
}

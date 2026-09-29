"use client";

import { forwardRef } from "react";

import {
  PrismStage,
  type PrismStageHandle,
} from "./stage/PrismStage";
import type { PrismHomeFrame } from "./stage/prism-home-frame";
import type { PrismState } from "./state/prism-state";

export interface PrismProps {
  state: PrismState;
  homeFrame?: PrismHomeFrame;
  onInteractionStart?: () => void;
  className?: string;
}

export type PrismHandle = PrismStageHandle;

export const Prism = forwardRef<PrismHandle, PrismProps>(function Prism(
  { state, homeFrame, onInteractionStart, className },
  ref,
) {
  return (
    <PrismStage
      ref={ref}
      className={className}
      homeFrame={homeFrame}
      onInteractionStart={onInteractionStart}
      state={state}
    />
  );
});

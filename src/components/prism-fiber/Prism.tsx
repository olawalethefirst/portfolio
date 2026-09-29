"use client";

import { forwardRef } from "react";

import {
  PrismStage,
  type PrismStageHandle,
  type PrismViewState,
} from "./stage/PrismStage";
import type { PrismHomeFrame } from "./stage/prism-home-frame";
import type { PrismState } from "./state/prism-state";

export interface PrismProps {
  state: PrismState;
  homeFrame?: PrismHomeFrame;
  onViewStateChange?: (viewState: PrismViewState) => void;
  className?: string;
}

export type PrismHandle = PrismStageHandle;
export type { PrismViewState };

export const Prism = forwardRef<PrismHandle, PrismProps>(function Prism(
  { state, homeFrame, onViewStateChange, className },
  ref,
) {
  return (
    <PrismStage
      ref={ref}
      className={className}
      homeFrame={homeFrame}
      onViewStateChange={onViewStateChange}
      state={state}
    />
  );
});

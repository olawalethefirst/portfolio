export const PRISM_STATES = [
  "idea",
  "iterate",
  "solution",
] as const;

export type PrismState = (typeof PRISM_STATES)[number];

export const PRISM_INITIAL_STATE: PrismState = "solution";

export function getNextPrismState(state: PrismState): PrismState {
  const currentIndex = PRISM_STATES.indexOf(state);
  return PRISM_STATES[(currentIndex + 1) % PRISM_STATES.length];
}

export interface PrismStateTargets {
  readonly prismRotationYDeg: number;
  readonly monitorOpacity: number;
}

export const PRISM_STATE_TARGETS = {
  idea: {
    prismRotationYDeg: 155,
    monitorOpacity: 0,
  },
  iterate: {
    prismRotationYDeg: 85,
    monitorOpacity: 0,
  },
  solution: {
    prismRotationYDeg: 120,
    monitorOpacity: 1,
  },
} satisfies Record<PrismState, PrismStateTargets>;

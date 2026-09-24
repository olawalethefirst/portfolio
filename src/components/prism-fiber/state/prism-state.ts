export type PrismState = "idea" | "iterate" | "solution";

export const PRISM_STATES: readonly PrismState[] = [
  "idea",
  "iterate",
  "solution",
];

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

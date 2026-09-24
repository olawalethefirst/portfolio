import { describe, expect, it } from "vitest";

import { PRISM_STATES, PRISM_STATE_TARGETS } from "./prism-state";

describe("PRISM_STATES", () => {
  it("defines the shared hero segment order", () => {
    expect(PRISM_STATES).toEqual(["idea", "iterate", "solution"]);
  });
});

describe("PRISM_STATE_TARGETS", () => {
  it("maps each semantic state to its approved object targets", () => {
    expect(PRISM_STATE_TARGETS).toEqual({
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
    });
  });
});

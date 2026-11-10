import { Euler, MathUtils, Quaternion } from "three";
import { describe, expect, it } from "vitest";

import {
  ARM_POSES,
  HEAD_POSES,
  resolveRestRelativeQuaternion,
} from "./figure-poses";

describe("figure pose targets", () => {
  it("retains the approved head turns", () => {
    expect(HEAD_POSES).toEqual({
      idea: { Head: { x: 0, y: 20, z: 0 }, neck: { x: 0, y: 0, z: 0 } },
      iterate: {
        Head: { x: 0, y: -20, z: 0 },
        neck: { x: 0, y: 0, z: 0 },
      },
      solution: {
        Head: { x: 0, y: 0, z: 0 },
        neck: { x: 0, y: 0, z: 0 },
      },
    });
  });

  it("retains the approved arm deltas", () => {
    expect(ARM_POSES).toEqual({
      idea: {
        RightShoulder: { x: 0, y: 0, z: 0 },
        RightArm: { x: -30, y: -55, z: -25 },
        RightForeArm: { x: -65, y: 55, z: -10 },
        RightHand: { x: 0, y: 5, z: 0 },
      },
      iterate: {
        RightShoulder: { x: -5, y: 45, z: 0 },
        RightArm: { x: 0, y: 0, z: 0 },
        RightForeArm: { x: -90, y: 0, z: 0 },
        RightHand: { x: 5, y: 40, z: 15 },
      },
      solution: {
        RightShoulder: { x: 0, y: 30, z: -5 },
        RightArm: { x: 0, y: 0, z: 0 },
        RightForeArm: { x: -25, y: 0, z: -35 },
        RightHand: { x: 10, y: 10, z: 0 },
      },
    });
  });

  it("composes a pose delta after the model's captured rest rotation", () => {
    const rest = new Quaternion().setFromEuler(
      new Euler(0, MathUtils.degToRad(25), 0, "XYZ"),
    );
    const delta = new Quaternion().setFromEuler(
      new Euler(
        MathUtils.degToRad(-30),
        MathUtils.degToRad(-55),
        MathUtils.degToRad(-25),
        "XYZ",
      ),
    );

    const result = resolveRestRelativeQuaternion(
      rest,
      ARM_POSES.idea.RightArm,
    );

    expect(result.angleTo(rest.clone().multiply(delta))).toBeCloseTo(0);
    expect(rest.angleTo(result)).toBeGreaterThan(0);
  });
});

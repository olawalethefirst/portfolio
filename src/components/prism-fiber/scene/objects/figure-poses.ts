import { Euler, MathUtils, Quaternion } from "three";

import type { PrismState } from "../../state/prism-state";

export type PoseDelta = Readonly<{ x: number; y: number; z: number }>;

export type ArmBoneName =
  | "RightShoulder"
  | "RightArm"
  | "RightForeArm"
  | "RightHand";
export type HeadBoneName = "Head" | "neck";

export const ARM_BONE_NAMES: readonly ArmBoneName[] = [
  "RightShoulder",
  "RightArm",
  "RightForeArm",
  "RightHand",
];
export const HEAD_BONE_NAMES: readonly HeadBoneName[] = ["Head", "neck"];

export const ARM_POSES = {
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
} satisfies Record<PrismState, Record<ArmBoneName, PoseDelta>>;

export const HEAD_POSES = {
  idea: { Head: { x: 0, y: 20, z: 0 }, neck: { x: 0, y: 0, z: 0 } },
  iterate: { Head: { x: 0, y: -20, z: 0 }, neck: { x: 0, y: 0, z: 0 } },
  solution: { Head: { x: 0, y: 0, z: 0 }, neck: { x: 0, y: 0, z: 0 } },
} satisfies Record<PrismState, Record<HeadBoneName, PoseDelta>>;

export function resolveRestRelativeQuaternion(
  rest: Quaternion,
  pose: PoseDelta,
): Quaternion {
  const delta = new Quaternion().setFromEuler(
    new Euler(
      MathUtils.degToRad(pose.x),
      MathUtils.degToRad(pose.y),
      MathUtils.degToRad(pose.z),
      "XYZ",
    ),
  );

  return rest.clone().multiply(delta);
}

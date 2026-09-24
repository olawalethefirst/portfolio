import {
  Bone,
  Box3,
  Color,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SpotLight,
  Texture,
  Vector3,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { MotionChannel } from "../../motion/motion-channel";
import { easeInOutSine } from "../../motion/easing";
import type { PrismState } from "../../state/prism-state";
import {
  cloneMaterials,
  cloneTexture,
  createOwnedResources,
  fitAssembly,
  isBone,
  isSkinnedMesh,
  type BuiltSceneObject,
  type PropTransform,
} from "../scene-utils";
import {
  ARM_BONE_NAMES,
  ARM_POSES,
  HEAD_BONE_NAMES,
  HEAD_POSES,
  resolveRestRelativeQuaternion,
  type ArmBoneName,
  type HeadBoneName,
  type PoseDelta,
} from "./figure-poses";

const FIGURE_TRANSFORM: PropTransform = {
  position: [0, -0.54, -0.61],
  rotation: [0, 0, 0],
  scale: 0.023,
};

interface BoneBinding<Name extends string> {
  name: Name;
  bone: Bone;
  rest: Quaternion;
  start: Quaternion;
  target: Quaternion;
}

export interface BuiltFigureObject extends BuiltSceneObject {
  light: SpotLight;
  pose: MotionChannel<PrismState>;
}

function includesName<Name extends string>(
  names: readonly Name[],
  candidate: string,
): candidate is Name {
  return names.some((name) => name === candidate);
}

function requireBoneBindings<Name extends string>(
  candidates: ReadonlyMap<Name, Bone>,
  names: readonly Name[],
): readonly BoneBinding<Name>[] {
  return names.map((name) => {
    const bone = candidates.get(name);
    if (!bone) {
      throw new Error(`Required figure binding was not found: ${name}`);
    }
    const rest = bone.quaternion.clone();
    return {
      name,
      bone,
      rest,
      start: rest.clone(),
      target: rest.clone(),
    };
  });
}

function snapPose<Name extends string>(
  bindings: readonly BoneBinding<Name>[],
  pose: Readonly<Record<Name, PoseDelta>>,
) {
  bindings.forEach((binding) => {
    binding.target.copy(
      resolveRestRelativeQuaternion(binding.rest, pose[binding.name]),
    );
    binding.bone.quaternion.copy(binding.target);
    binding.start.copy(binding.target);
  });
}

function beginPoseTransition<Name extends string>(
  bindings: readonly BoneBinding<Name>[],
  pose: Readonly<Record<Name, PoseDelta>>,
) {
  bindings.forEach((binding) => {
    binding.start.copy(binding.bone.quaternion);
    binding.target.copy(
      resolveRestRelativeQuaternion(binding.rest, pose[binding.name]),
    );
  });
}

function interpolatePose<Name extends string>(
  bindings: readonly BoneBinding<Name>[],
  progress: number,
) {
  bindings.forEach(({ bone, start, target }) => {
    bone.quaternion.copy(start).slerp(target, progress);
  });
}

function createFigurePoseChannel(
  figure: Group,
  armBindings: readonly BoneBinding<ArmBoneName>[],
  headBindings: readonly BoneBinding<HeadBoneName>[],
): MotionChannel<PrismState> {
  return {
    snap(pose) {
      snapPose(armBindings, ARM_POSES[pose]);
      snapPose(headBindings, HEAD_POSES[pose]);
      figure.updateMatrixWorld(true);
    },
    beginTransition(pose) {
      beginPoseTransition(armBindings, ARM_POSES[pose]);
      beginPoseTransition(headBindings, HEAD_POSES[pose]);
    },
    update(timelineProgress) {
      const progress = easeInOutSine(timelineProgress);
      interpolatePose(armBindings, progress);
      interpolatePose(headBindings, progress);
      figure.updateMatrixWorld(true);
    },
  };
}

export function buildFigureObject(
  source: Group,
  textureSource: Texture,
): BuiltFigureObject {
  const resources = createOwnedResources();
  const assembly = new Group();
  const clonedFigure = clone(source);
  if (!(clonedFigure instanceof Group)) {
    throw new Error("The cloned prism figure root is not a Group.");
  }
  const figure = clonedFigure;
  cloneMaterials(figure, resources);
  const texture = cloneTexture(textureSource, resources, true);
  texture.flipY = false;
  const armBoneCandidates = new Map<ArmBoneName, Bone>();
  const headBoneCandidates = new Map<HeadBoneName, Bone>();

  figure.traverse((object) => {
    if (isSkinnedMesh(object)) {
      object.frustumCulled = false;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        material.side = DoubleSide;
        if (material instanceof MeshStandardMaterial) {
          material.map = texture;
          material.emissive = new Color(0x000000);
          material.needsUpdate = true;
        }
      });
    }
    if (!isBone(object)) return;
    if (includesName(ARM_BONE_NAMES, object.name)) {
      armBoneCandidates.set(object.name, object);
    }
    if (includesName(HEAD_BONE_NAMES, object.name)) {
      headBoneCandidates.set(object.name, object);
    }
  });

  const armBindings = requireBoneBindings(armBoneCandidates, ARM_BONE_NAMES);
  const headBindings = requireBoneBindings(headBoneCandidates, HEAD_BONE_NAMES);

  assembly.add(figure);
  const rawBox = new Box3().setFromObject(assembly);
  const rawSize = rawBox.getSize(new Vector3());
  const target = new Object3D();
  target.position.set(0, rawBox.min.y + rawSize.y * 0.6, rawBox.max.z);
  assembly.add(target);

  const light = new SpotLight(0xfff0e0, 1, 0.75, 1.2, 0.6, 0);
  light.position.set(0, 0.4, 2.3881);
  light.target = target;

  return {
    group: fitAssembly(assembly, 0.65 / 3, "y", FIGURE_TRANSFORM),
    light,
    pose: createFigurePoseChannel(figure, armBindings, headBindings),
    dispose: resources.dispose,
  };
}

import {
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  Texture,
  Vector3,
} from "three";

import type { MotionChannel } from "../../motion/motion-channel";
import { easeOutCubic } from "../../motion/easing";
import {
  cloneMaterials,
  cloneTexture,
  createOwnedResources,
  fitAssembly,
  requireMesh,
  setDoubleSided,
  surfaceDetails,
  type BuiltSceneObject,
  type PropTransform,
} from "../scene-utils";

const DESK_TRANSFORM: PropTransform = {
  position: [-0.14, -0.09, -0.23],
  rotation: [0, 270, 0],
  scale: 0.879,
};

export interface BuiltOfficeObject extends BuiltSceneObject {
  monitorOpacity: MotionChannel<number>;
  applyMonitorTexture(texture: Texture): void;
}

function createOpacityChannel(
  material: MeshBasicMaterial,
): MotionChannel<number> {
  let startOpacity = material.opacity;
  let targetOpacity = material.opacity;

  return {
    snap(target) {
      material.opacity = MathUtils.clamp(target, 0, 1);
      startOpacity = material.opacity;
      targetOpacity = material.opacity;
    },
    beginTransition(target) {
      startOpacity = material.opacity;
      targetOpacity = MathUtils.clamp(target, 0, 1);
    },
    update(timelineProgress) {
      material.opacity = MathUtils.lerp(
        startOpacity,
        targetOpacity,
        easeOutCubic(timelineProgress),
      );
    },
  };
}

export function buildOfficeObject(
  source: Group,
  textureSource: Texture,
): BuiltOfficeObject {
  const resources = createOwnedResources();
  try {
    const assembly = new Group();
    const office = source.clone(true);
    cloneMaterials(office, resources);
    setDoubleSided(office);
    assembly.add(office);
    office.updateMatrixWorld(true);

    const screen = surfaceDetails(requireMesh(office, /screen_desktop/i));
    const aspect = 216 / 124;
    const byHeight = {
      height: screen.size.z * 0.92,
      width: screen.size.z * 0.92 * aspect,
    };
    const byWidth = {
      width: screen.size.y * 0.92,
      height: (screen.size.y * 0.92) / aspect,
    };
    const finalSize = byHeight.width <= byWidth.width ? byHeight : byWidth;
    const geometry = new PlaneGeometry(finalSize.width, finalSize.height);
    resources.geometries.add(geometry);
    const texture = cloneTexture(textureSource, resources);
    const material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
      transparent: true,
      opacity: 0,
    });
    resources.materials.add(material);
    const wrapper = new Group();
    wrapper.add(new Mesh(geometry, material));
    assembly.add(wrapper);

    wrapper.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), screen.normal);
    wrapper.quaternion.multiply(
      new Quaternion().setFromAxisAngle(
        new Vector3(0, 0, 1),
        MathUtils.degToRad(13),
      ),
    );
    wrapper.position.copy(screen.center).addScaledVector(screen.normal, 0.01);
    wrapper.position.add(new Vector3(0.016, 0.01, 0));
    wrapper.scale.setScalar(1.94);
    texture.wrapS = RepeatWrapping;
    texture.repeat.x = -1;
    texture.offset.x = 1;
    texture.needsUpdate = true;

    return {
      group: fitAssembly(assembly, 0.65 / 3, "x", DESK_TRANSFORM),
      monitorOpacity: createOpacityChannel(material),
      applyMonitorTexture(replacement) {
        replacement.colorSpace = texture.colorSpace;
        replacement.wrapS = texture.wrapS;
        replacement.wrapT = texture.wrapT;
        replacement.repeat.copy(texture.repeat);
        replacement.offset.copy(texture.offset);
        replacement.flipY = texture.flipY;
        replacement.needsUpdate = true;
        material.map = replacement;
        material.needsUpdate = true;
      },
      dispose: resources.dispose,
    };
  } catch (error) {
    resources.dispose();
    throw error;
  }
}

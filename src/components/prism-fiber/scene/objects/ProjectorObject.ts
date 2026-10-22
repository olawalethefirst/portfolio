import {
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Texture,
  Vector3,
} from "three";

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

const PROJECTOR_TRANSFORM: PropTransform = {
  // Keep the assembly inside the prism, clear of the glass at local z = -0.01.
  position: [0, -0.05, -0.02],
  rotation: [0, 90, 0],
  scale: 0.04,
};

export function buildProjectorObject(
  source: Group,
  textureSource: Texture,
): BuiltSceneObject {
  const resources = createOwnedResources();
  try {
    const assembly = new Group();
    const projector = source.clone(true);
    cloneMaterials(projector, resources);
    setDoubleSided(projector);
    assembly.add(projector);
    projector.updateMatrixWorld(true);

    const screen = surfaceDetails(requireMesh(projector, /Screen_Rilsan/i));
    const height = screen.size.z * 0.35 * 1.25;
    const geometry = new PlaneGeometry(height * (351 / 238), height);
    resources.geometries.add(geometry);
    const material = new MeshStandardMaterial({
      map: cloneTexture(textureSource, resources),
      transparent: true,
      side: DoubleSide,
      roughness: 0.6,
      metalness: 0,
    });
    resources.materials.add(material);
    const wrapper = new Group();
    wrapper.add(new Mesh(geometry, material));
    wrapper.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), screen.normal);
    wrapper.position.copy(screen.center).addScaledVector(screen.normal, 0.05);
    wrapper.scale.setScalar(1.25);
    assembly.add(wrapper);

    return {
      group: fitAssembly(
        assembly,
        0.95 * 0.6,
        "x",
        PROJECTOR_TRANSFORM,
      ),
      dispose: resources.dispose,
    };
  } catch (error) {
    resources.dispose();
    throw error;
  }
}

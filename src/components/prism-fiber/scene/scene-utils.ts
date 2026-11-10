import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Group,
  Material,
  MathUtils,
  Mesh,
  Object3D,
  SRGBColorSpace,
  SkinnedMesh,
  Texture,
  Vector3,
  Bone,
} from "three";

export interface PropTransform {
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: number;
}

export interface SurfaceDetails {
  normal: Vector3;
  center: Vector3;
  size: Vector3;
}

export interface BuiltSceneObject {
  group: Group;
  dispose(): void;
}

export interface OwnedResources {
  geometries: Set<BufferGeometry>;
  materials: Set<Material>;
  textures: Set<Texture>;
  dispose(): void;
}

export function createOwnedResources(): OwnedResources {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();

  return {
    geometries,
    materials,
    textures,
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}

export function isMesh(object: Object3D): object is Mesh {
  return "isMesh" in object && object.isMesh === true;
}

export function isSkinnedMesh(object: Object3D): object is SkinnedMesh {
  return "isSkinnedMesh" in object && object.isSkinnedMesh === true;
}

export function isBone(object: Object3D): object is Bone {
  return "isBone" in object && object.isBone === true;
}

export function cloneMaterials(root: Object3D, resources: OwnedResources) {
  root.traverse((object) => {
    if (!isMesh(object)) return;
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => {
        const clone = material.clone();
        resources.materials.add(clone);
        return clone;
      });
      return;
    }
    const clone = object.material.clone();
    resources.materials.add(clone);
    object.material = clone;
  });
}

export function setDoubleSided(root: Object3D) {
  root.traverse((object) => {
    if (!isMesh(object)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      material.side = DoubleSide;
      material.needsUpdate = true;
    });
  });
}

export function requireMesh(root: Object3D, pattern: RegExp): Mesh {
  let result: Mesh | null = null;
  root.traverse((object) => {
    if (!result && isMesh(object) && pattern.test(object.name)) result = object;
  });
  if (!result) throw new Error(`Required prism mesh was not found: ${pattern}`);
  return result;
}

export function surfaceDetails(mesh: Mesh): SurfaceDetails {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox;
  if (!boundingBox) throw new Error(`Unable to measure prism mesh: ${mesh.name}`);

  const localSize = boundingBox.getSize(new Vector3());
  const axes = [
    { direction: new Vector3(1, 0, 0), size: localSize.x },
    { direction: new Vector3(0, 1, 0), size: localSize.y },
    { direction: new Vector3(0, 0, 1), size: localSize.z },
  ].sort((a, b) => a.size - b.size);
  const normal = axes[0].direction
    .clone()
    .transformDirection(mesh.matrixWorld)
    .normalize();
  const worldBox = new Box3().setFromObject(mesh);

  return {
    normal,
    center: worldBox.getCenter(new Vector3()),
    size: worldBox.getSize(new Vector3()),
  };
}

export function applyPropTransform(group: Group, transform: PropTransform) {
  group.position.set(...transform.position);
  group.rotation.set(
    MathUtils.degToRad(transform.rotation[0]),
    MathUtils.degToRad(transform.rotation[1]),
    MathUtils.degToRad(transform.rotation[2]),
  );
  group.scale.setScalar(transform.scale);
}

export function fitAssembly(
  assembly: Group,
  targetWidth: number,
  measure: "x" | "y",
  transform: PropTransform,
): Group {
  const size = new Box3().setFromObject(assembly).getSize(new Vector3());
  assembly.scale.setScalar(targetWidth / size[measure]);
  const scaledBox = new Box3().setFromObject(assembly);
  assembly.position.set(0, -scaledBox.min.y - 0.55, -0.15);

  const control = new Group();
  control.add(assembly);
  applyPropTransform(control, transform);
  return control;
}

export function cloneTexture(
  source: Texture,
  resources: OwnedResources,
  colorTexture = false,
): Texture {
  const texture = source.clone();
  if (colorTexture) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  resources.textures.add(texture);
  return texture;
}

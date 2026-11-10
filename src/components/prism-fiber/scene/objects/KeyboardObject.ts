import { Box3, Group, Mesh, Vector3 } from "three";

import { cloneMaterials, type OwnedResources } from "../scene-utils";

/** The supplied asset has Y up, X across the keys, and the spacebar at +Z. */
export function buildKeyboardReplacement(
  source: Group,
  reference: Mesh,
  desktop: Mesh,
  resources: OwnedResources,
): Group {
  const keyboard = source.clone(true);
  cloneMaterials(keyboard, resources);
  const placement = new Group();
  placement.name = "replacement-keyboard";
  placement.add(keyboard);
  // +Z (spacebar) becomes +X (user); -Z (top row) faces the monitor at -X.
  placement.rotation.y = Math.PI / 2;
  const target = new Box3().setFromObject(reference);
  const initial = new Box3().setFromObject(placement);
  const width = initial.getSize(new Vector3()).z;
  if (width <= 0) throw new Error("The replacement keyboard has no measurable width");
  placement.scale.setScalar(target.getSize(new Vector3()).z / width);
  const fitted = new Box3().setFromObject(placement);
  const center = fitted.getCenter(new Vector3());
  const targetCenter = target.getCenter(new Vector3());
  const deskTop = new Box3().setFromObject(desktop).max.y;
  placement.position.set(
    targetCenter.x - center.x,
    deskTop + 0.005 - fitted.min.y,
    targetCenter.z - center.z,
  );
  return placement;
}

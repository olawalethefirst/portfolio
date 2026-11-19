import { Group, MathUtils } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import { easeInOutCubic } from "../motion/easing";
import type { MotionChannel } from "../motion/motion-channel";
import { PRISM_STATES, type PrismState } from "../state/prism-state";
import type { OwnedResources } from "./scene-utils";

/** Faces are built in this order: board, projector, office. */
const FACE_INDEX_BY_STATE: Record<PrismState, number> = {
  idea: 0,
  iterate: 1,
  solution: 2,
};

/** Outline thickness in CSS pixels, independent of zoom and device pixel ratio. */
export const FACE_OUTLINE_WIDTH_PX = 2;
const OUTLINE_INSET = 0.008;

/**
 * Width at which three faces at `distance` from the prism axis meet exactly at
 * their vertical edges: the side of the equilateral triangle with that apothem.
 */
export function mitredFaceWidth(distance: number) {
  return 2 * Math.sqrt(3) * distance;
}

export interface FaceOutlineSpec {
  readonly height: number;
  readonly apothem: number;
}

export interface FaceOutlines {
  group: Group;
  selection: MotionChannel<PrismState>;
  applyColor(color: string): void;
  /** Fat lines need the canvas size in CSS pixels to keep a fixed pixel width. */
  setViewportSize(width: number, height: number): void;
}

/**
 * One thin accent outline per prism face. Only the selected state's face is
 * visible; the selection channel cross-fades between faces.
 */
export function buildFaceOutlines(
  spec: FaceOutlineSpec,
  resources: OwnedResources,
): FaceOutlines {
  // Sits just outside the glass backing so it never z-fights with it.
  const distance = spec.apothem - OUTLINE_INSET;
  const halfWidth = mitredFaceWidth(distance) / 2;
  const halfHeight = spec.height / 2;
  const geometry = new LineGeometry();
  geometry.setPositions([
    -halfWidth, -halfHeight, 0,
    halfWidth, -halfHeight, 0,
    halfWidth, halfHeight, 0,
    -halfWidth, halfHeight, 0,
    -halfWidth, -halfHeight, 0,
  ]);
  resources.geometries.add(geometry);

  const group = new Group();
  const materials = PRISM_STATES.map(() => {
    const material = new LineMaterial({
      linewidth: FACE_OUTLINE_WIDTH_PX,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    resources.materials.add(material);
    return material;
  });

  materials.forEach((material, index) => {
    const angle = index * ((2 * Math.PI) / 3);
    const outline = new Line2(geometry, material);
    outline.position.set(Math.sin(angle) * distance, 0, Math.cos(angle) * distance);
    outline.rotation.y = angle;
    group.add(outline);
  });

  const targetFor = (state: PrismState) =>
    materials.map((_, index) => (index === FACE_INDEX_BY_STATE[state] ? 1 : 0));
  let start = materials.map(material => material.opacity);
  let target = start;

  let viewportWidth = 0;
  let viewportHeight = 0;

  return {
    group,
    setViewportSize(width, height) {
      if (width === viewportWidth && height === viewportHeight) return;
      viewportWidth = width;
      viewportHeight = height;
      materials.forEach(material => material.resolution.set(width, height));
    },
    applyColor(color) {
      materials.forEach(material => material.color.set(color));
    },
    selection: {
      snap(state) {
        target = targetFor(state);
        start = target;
        materials.forEach((material, index) => { material.opacity = target[index]; });
      },
      beginTransition(state) {
        start = materials.map(material => material.opacity);
        target = targetFor(state);
      },
      update(timelineProgress) {
        const eased = easeInOutCubic(timelineProgress);
        materials.forEach((material, index) => {
          material.opacity = MathUtils.lerp(start[index], target[index], eased);
        });
      },
    },
  };
}

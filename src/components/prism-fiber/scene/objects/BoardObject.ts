import { Box3, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import type { BoardAppearance } from "../prism-appearance";

import {
  cloneMaterials,
  createOwnedResources,
  fitAssembly,
  isMesh,
  requireMesh,
  setDoubleSided,
  surfaceDetails,
  type BuiltSceneObject,
  type PropTransform,
} from "../scene-utils";

const BOARD_TRANSFORM: PropTransform = {
  position: [-0.06, 0.2, -0.16],
  rotation: [0, 180, 0],
  scale: 0.86,
};

interface NoteControls {
  posX: number;
  posY: number;
  posZ: number;
  tiltXDeg: number;
  tiltZDeg: number;
}

const NOTE_CONTROLS: readonly NoteControls[] = [
  { posX: -0.06, posY: 0.06, posZ: -0.12, tiltXDeg: -28, tiltZDeg: 6 },
  { posX: -0.59, posY: 0.31, posZ: -0.086, tiltXDeg: -16, tiltZDeg: 10 },
  { posX: -0.84, posY: 0, posZ: -0.092, tiltXDeg: -22, tiltZDeg: 6 },
  { posX: -0.86, posY: -1.12, posZ: -0.098, tiltXDeg: -38, tiltZDeg: 6 },
  { posX: 0.96, posY: -0.29, posZ: -0.084, tiltXDeg: -14, tiltZDeg: 5 },
  { posX: -0.55, posY: 0.01, posZ: -0.084, tiltXDeg: -14, tiltZDeg: 6 },
  { posX: -0.55, posY: -1.09, posZ: -0.088, tiltXDeg: -18, tiltZDeg: 5 },
  { posX: 2.02, posY: -0.87, posZ: -0.03, tiltXDeg: -30, tiltZDeg: 6 },
  { posX: 2.01, posY: -0.72, posZ: -0.028, tiltXDeg: -32, tiltZDeg: 5 },
  { posX: 0.38, posY: 0, posZ: -0.026, tiltXDeg: -24, tiltZDeg: 2 },
  { posX: 1.04, posY: -0.02, posZ: -0.018, tiltXDeg: -12, tiltZDeg: 5 },
  { posX: 0.02, posY: 0.02, posZ: -0.022, tiltXDeg: -18, tiltZDeg: 3 },
];

interface NoteSource {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  mesh: Mesh;
}

function decomposeNote(mesh: Mesh): NoteSource {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  mesh.matrixWorld.decompose(position, quaternion, scale);
  return { position, quaternion, scale, mesh };
}

function buildNoteSlot(
  assembly: Group,
  anchor: NoteSource,
  appearance: NoteSource,
  controls: NoteControls,
  faceBox: Box3,
  boardWidth: number,
  correctTopLeft: boolean,
) {
  const wrapper = new Group();
  wrapper.add(new Mesh(appearance.mesh.geometry, appearance.mesh.material));
  wrapper.position.copy(anchor.position);
  wrapper.quaternion.copy(anchor.quaternion);
  wrapper.scale.copy(anchor.scale);
  wrapper.updateMatrixWorld(true);

  if (correctTopLeft) {
    const margin = boardWidth * 0.02;
    const noteBox = new Box3().setFromObject(wrapper);
    wrapper.position.x += faceBox.min.x + margin - noteBox.min.x;
    wrapper.position.y += faceBox.max.y - margin - noteBox.max.y;
    wrapper.updateMatrixWorld(true);
  }

  const finalBox = new Box3().setFromObject(wrapper);
  const pivot = new Vector3(
    (finalBox.min.x + finalBox.max.x) / 2,
    finalBox.max.y,
    (finalBox.min.z + finalBox.max.z) / 2,
  );
  const hinge = new Group();
  wrapper.position.sub(pivot);
  hinge.add(wrapper);
  hinge.position.set(
    pivot.x + controls.posX,
    pivot.y + controls.posY,
    pivot.z + controls.posZ,
  );
  hinge.rotation.set(
    (controls.tiltXDeg * Math.PI) / 180,
    0,
    (controls.tiltZDeg * Math.PI) / 180,
  );
  assembly.add(hinge);
}

export interface BuiltBoardObject extends BuiltSceneObject {
  applyAppearance(appearance: BoardAppearance): void;
  applyNotePalette(colors: readonly [string, string, string]): void;
}

export function buildBoardObject(
  boardSource: Group,
  notesSource: Group,
): BuiltBoardObject {
  const resources = createOwnedResources();
  try {
    const assembly = new Group();
    const board = boardSource.clone(true);
    cloneMaterials(board, resources);
    setDoubleSided(board);

    const boardBox = new Box3().setFromObject(board);
    const boardCenter = boardBox.getCenter(new Vector3());
    const boardSize = boardBox.getSize(new Vector3());
    board.position.sub(boardCenter);
    board.position.y += boardSize.y / 2;
    assembly.add(board);
    board.updateMatrixWorld(true);

    const faceBox = new Box3().setFromObject(requireMesh(board, /boardFace/i));
    const notes = notesSource.clone(true);
    cloneMaterials(notes, resources);
    setDoubleSided(notes);
    notes.updateMatrixWorld(true);
    let sample: Mesh | null = null;
    notes.traverse((object) => {
      if (!sample && isMesh(object)) sample = object;
    });
    if (!sample) throw new Error("The prism notes asset contains no mesh.");
    notes.quaternion.setFromUnitVectors(
      surfaceDetails(sample).normal,
      new Vector3(0, 0, 1),
    );
    notes.updateMatrixWorld(true);

    const notesSize = new Box3().setFromObject(notes).getSize(new Vector3());
    notes.scale.setScalar((boardSize.x * 0.16) / notesSize.x);
    notes.updateMatrixWorld(true);
    const positionedBox = new Box3().setFromObject(notes);
    const positionedCenter = positionedBox.getCenter(new Vector3());
    notes.position.x += -positionedCenter.x - boardSize.x * 0.18;
    notes.position.y +=
      -positionedCenter.y +
      (faceBox.min.y + faceBox.max.y) * 0.5 +
      boardSize.y * 0.18;
    notes.position.z += faceBox.max.z + 0.004 - positionedBox.min.z;
    notes.updateMatrixWorld(true);

    const sources = [
      decomposeNote(requireMesh(notes, /^pPlane4_lambert28_0$/)),
      decomposeNote(requireMesh(notes, /^pPlane3_lambert29_0$/)),
      decomposeNote(requireMesh(notes, /^pPlane5_lambert30_0$/)),
    ];
    const noteMaterials = sources.map(({ mesh }) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      return materials.map(material => {
        if (!(material instanceof MeshStandardMaterial)) throw new Error("Unsupported Prism note material");
        return material;
      });
    });
    buildNoteSlot(
      assembly,
      sources[0],
      sources[0],
      NOTE_CONTROLS[0],
      faceBox,
      boardSize.x,
      true,
    );
    for (let index = 1; index < 7; index += 1) {
      buildNoteSlot(
        assembly,
        sources[1],
        sources[(index - 1) % 3],
        NOTE_CONTROLS[index],
        faceBox,
        boardSize.x,
        false,
      );
    }
    for (let index = 7; index < 12; index += 1) {
      buildNoteSlot(
        assembly,
        sources[2],
        sources[(index - 1) % 3],
        NOTE_CONTROLS[index],
        faceBox,
        boardSize.x,
        false,
      );
    }

    return {
      group: fitAssembly(assembly, 0.95 * 0.6, "x", BOARD_TRANSFORM),
      applyAppearance(appearance) {
        board.traverse((object) => {
          if (!isMesh(object)) return;
          const color = /boardFace/i.test(object.name) ? appearance.faceColor
            : /boardBack/i.test(object.name) ? appearance.backColor
              : appearance.frameColor;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (!(material instanceof MeshStandardMaterial)) {
              throw new Error("Unsupported Prism board material");
            }
            material.color.setHex(color);
          });
        });
      },
      applyNotePalette(colors) {
        noteMaterials.forEach((materials, index) => materials.forEach(material => material.color.set(colors[index])));
      },
      dispose: resources.dispose,
    };
  } catch (error) {
    resources.dispose();
    throw error;
  }
}

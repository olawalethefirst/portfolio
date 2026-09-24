import {
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Texture,
} from "three";

import { easeInOutCubic } from "../motion/easing";
import type { MotionChannel } from "../motion/motion-channel";
import type { PrismMotionChannels } from "../motion/prism-transition";
import { buildBoardObject } from "./objects/BoardObject";
import { buildFigureObject } from "./objects/FigureObject";
import { buildOfficeObject } from "./objects/OfficeObject";
import { buildProjectorObject } from "./objects/ProjectorObject";
import { createOwnedResources } from "./scene-utils";

const FACE_WIDTH = 1;
const FACE_HEIGHT = 1.15;
const CONTENT_HEIGHT = 1.1;

export interface PrismStructureAssets {
  board: Group;
  figure: Group;
  notes: Group;
  office: Group;
  projector: Group;
}

export interface PrismStructureTextures {
  figure: Texture;
  monitor: Texture;
  wireframe: Texture;
}

export interface BuiltPrismStructure {
  root: Group;
  channels: PrismMotionChannels;
  dispose(): void;
}

function createRotationChannel(prism: Group): MotionChannel<number> {
  let startRotation = prism.rotation.y;
  let targetRotation = prism.rotation.y;

  return {
    snap(targetDegrees) {
      prism.rotation.y = MathUtils.degToRad(targetDegrees);
      startRotation = prism.rotation.y;
      targetRotation = prism.rotation.y;
    },
    beginTransition(targetDegrees) {
      startRotation = prism.rotation.y;
      targetRotation = MathUtils.degToRad(targetDegrees);
    },
    update(timelineProgress) {
      prism.rotation.y = MathUtils.lerp(
        startRotation,
        targetRotation,
        easeInOutCubic(timelineProgress),
      );
    },
  };
}

export function buildPrismStructure(
  assets: PrismStructureAssets,
  textures: PrismStructureTextures,
): BuiltPrismStructure {
  const resources = createOwnedResources();
  const root = new Group();
  const prism = new Group();
  const backingGeometry = new PlaneGeometry(FACE_WIDTH, FACE_HEIGHT);
  const backingMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    side: DoubleSide,
  });
  resources.geometries.add(backingGeometry);
  resources.materials.add(backingMaterial);

  const apothem = FACE_WIDTH / (2 * Math.tan(Math.PI / 3));
  const faces = [new Group(), new Group(), new Group()];
  faces.forEach((face, index) => {
    const angle = index * ((2 * Math.PI) / 3);
    const backing = new Mesh(backingGeometry, backingMaterial);
    backing.position.set(
      Math.sin(angle) * (apothem - 0.01),
      0,
      Math.cos(angle) * (apothem - 0.01),
    );
    backing.rotation.y = angle;
    prism.add(backing);

    face.position.set(
      Math.sin(angle) * apothem,
      -(FACE_HEIGHT - CONTENT_HEIGHT) / 2,
      Math.cos(angle) * apothem,
    );
    face.rotation.y = angle;
    prism.add(face);
  });

  const board = buildBoardObject(assets.board, assets.notes);
  const projector = buildProjectorObject(assets.projector, textures.wireframe);
  const office = buildOfficeObject(assets.office, textures.monitor);
  const figure = buildFigureObject(assets.figure, textures.figure);

  faces[0].add(board.group);
  faces[1].add(projector.group);
  faces[2].add(office.group, figure.group);
  root.add(figure.light, prism);

  return {
    root,
    channels: {
      prismRotation: createRotationChannel(prism),
      figurePose: figure.pose,
      monitorOpacity: office.monitorOpacity,
    },
    dispose() {
      board.dispose();
      projector.dispose();
      office.dispose();
      figure.dispose();
      resources.dispose();
    },
  };
}

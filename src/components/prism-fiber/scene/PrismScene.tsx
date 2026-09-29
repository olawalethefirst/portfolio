"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { createPrismTransitionController } from "../motion/prism-transition";
import type { PrismState } from "../state/prism-state";
import { buildPrismStructure } from "./PrismStructure";

const ASSET_ROOT = "/prism-assets";
const TRANSITION_DURATION_MS = 700;

export interface PrismSceneProps {
  state: PrismState;
  viewAzimuthYRad?: number;
}

export function PrismScene({ state, viewAzimuthYRad = 0 }: PrismSceneProps) {
  const board = useGLTF(`${ASSET_ROOT}/board.glb`).scene;
  const figure = useGLTF(`${ASSET_ROOT}/figure.glb`).scene;
  const notes = useGLTF(`${ASSET_ROOT}/notes.glb`).scene;
  const office = useGLTF(`${ASSET_ROOT}/office.glb`).scene;
  const projector = useGLTF(`${ASSET_ROOT}/projector.glb`).scene;
  const figureTexture = useTexture(`${ASSET_ROOT}/figure-texture.jpg`);
  const monitorTexture = useTexture(`${ASSET_ROOT}/monitor-ui.svg`);
  const wireframeTexture = useTexture(`${ASSET_ROOT}/wireframe.svg`);

  const built = useMemo(
    () =>
      buildPrismStructure(
        { board, figure, notes, office, projector },
        {
          figure: figureTexture,
          monitor: monitorTexture,
          wireframe: wireframeTexture,
        },
      ),
    [
      board,
      figure,
      figureTexture,
      monitorTexture,
      notes,
      office,
      projector,
      wireframeTexture,
    ],
  );
  const transition = useMemo(
    () =>
      createPrismTransitionController(
        built.channels,
        TRANSITION_DURATION_MS,
      ),
    [built],
  );
  const initializedController = useRef<typeof transition | null>(null);

  useLayoutEffect(() => {
    const target = { state, viewAzimuthYRad };
    if (initializedController.current !== transition) {
      transition.snap(target);
      initializedController.current = transition;
      return;
    }
    transition.transitionTo(target);
  }, [state, transition, viewAzimuthYRad]);

  useEffect(
    () => () => {
      if (initializedController.current === transition) {
        initializedController.current = null;
      }
      built.dispose();
    },
    [built, transition],
  );

  useFrame((_, delta) => {
    transition.advance(delta * 1000);
  });

  return <primitive object={built.root} dispose={null} />;
}

useGLTF.preload(`${ASSET_ROOT}/board.glb`);
useGLTF.preload(`${ASSET_ROOT}/figure.glb`);
useGLTF.preload(`${ASSET_ROOT}/notes.glb`);
useGLTF.preload(`${ASSET_ROOT}/office.glb`);
useGLTF.preload(`${ASSET_ROOT}/projector.glb`);

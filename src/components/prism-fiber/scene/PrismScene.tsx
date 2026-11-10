"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { useLayoutEffect, useRef, useState } from "react";

import { createPrismTransitionController } from "../motion/prism-transition";
import type { PrismState } from "../state/prism-state";
import { buildPrismStructure } from "./PrismStructure";
import { useActiveTheme } from "@/src/theme/active-theme";
import { Group } from "three";
import { createPrismAccents } from "./prism-accents";
import { resolvePrismAppearance } from "./prism-appearance";

const ASSET_ROOT = "/prism-assets";
const TRANSITION_DURATION_MS = 700;

export interface PrismSceneProps {
  state: PrismState;
  viewAzimuthYRad?: number;
}

export function PrismScene({ state, viewAzimuthYRad = 0 }: PrismSceneProps) {
  const { mode, theme } = useActiveTheme();
  const board = useGLTF(`${ASSET_ROOT}/board.glb`).scene;
  const figure = useGLTF(`${ASSET_ROOT}/figure.glb`).scene;
  const notes = useGLTF(`${ASSET_ROOT}/notes.glb`).scene;
  const office = useGLTF(`${ASSET_ROOT}/office.glb`).scene;
  const keyboard = useGLTF("/keyboard.glb").scene;
  const projector = useGLTF(`${ASSET_ROOT}/projector.glb`).scene;
  const figureTexture = useTexture(`${ASSET_ROOT}/figure-texture.jpg`);
  const monitorTexture = useTexture(`${ASSET_ROOT}/monitor-ui.svg`);
  const wireframeTexture = useTexture(`${ASSET_ROOT}/wireframe.svg`);

  // The host owns no GPU resources; graph construction happens only on commit.
  const [host] = useState(() => new Group());
  const live = useRef<{
    built: ReturnType<typeof buildPrismStructure>;
    transition: ReturnType<typeof createPrismTransitionController>;
    accents: ReturnType<typeof createPrismAccents>;
    target?: { state: PrismState; viewAzimuthYRad: number };
    mode?: typeof mode;
  } | null>(null);

  useLayoutEffect(() => {
    const built = buildPrismStructure(
      { board, figure, notes, office, keyboard, projector },
      { figure: figureTexture, monitor: monitorTexture, wireframe: wireframeTexture },
    );
    try {
      const transition = createPrismTransitionController(built.channels, TRANSITION_DURATION_MS);
      const accents = createPrismAccents(built);
      live.current = { built, transition, accents };
      host.add(built.root);
      return () => {
        live.current = null;
        host.remove(built.root);
        accents.dispose();
        built.dispose();
      };
    } catch (error) {
      built.dispose();
      throw error;
    }
  }, [host, board, figure, notes, office, keyboard, projector, figureTexture, monitorTexture, wireframeTexture]);

  // Runs after graph setup on every commit; equality checks preserve active motion.
  useLayoutEffect(() => {
    const scene = live.current;
    if (!scene) throw new Error("Prism scene was not initialized");
    const target = { state, viewAzimuthYRad };
    if (!scene.target) scene.transition.snap(target);
    else if (scene.target.state !== state || scene.target.viewAzimuthYRad !== viewAzimuthYRad) {
      scene.transition.transitionTo(target);
    }
    scene.target = target;
    if (scene.mode !== mode) {
      scene.built.applyAppearance(resolvePrismAppearance(mode));
      scene.mode = mode;
    }
    scene.accents.update(theme);
  });

  useFrame((_, delta) => {
    live.current?.transition.advance(delta * 1000);
  });

  return <primitive object={host} dispose={null} />;
}

useGLTF.preload(`${ASSET_ROOT}/board.glb`);
useGLTF.preload(`${ASSET_ROOT}/figure.glb`);
useGLTF.preload(`${ASSET_ROOT}/notes.glb`);
useGLTF.preload(`${ASSET_ROOT}/office.glb`);
useGLTF.preload("/keyboard.glb");
useGLTF.preload(`${ASSET_ROOT}/projector.glb`);

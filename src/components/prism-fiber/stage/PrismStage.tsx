"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  forwardRef,
  Suspense,
  useCallback,
  useImperativeHandle,
  useRef,
  type ComponentRef,
} from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

import { cn } from "../../ui/utils";
import { PrismScene } from "../scene/PrismScene";
import type { PrismState } from "../state/prism-state";

export interface PrismStageProps {
  state: PrismState;
  onViewStateChange?: (viewState: PrismViewState) => void;
  className?: string;
}

export interface PrismViewState {
  hasEnteredZoom: boolean;
  hasRotationDrifted: boolean;
}

export interface PrismStageHandle {
  recentreView(): void;
}

const CENTERED_AZIMUTH_EPSILON = 0.001;

export const PrismStage = forwardRef<PrismStageHandle, PrismStageProps>(
  function PrismStage(
    { state, onViewStateChange, className = "" },
    ref,
  ) {
    const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
    const viewStateRef = useRef<PrismViewState>({
      hasEnteredZoom: false,
      hasRotationDrifted: false,
    });
    const publishViewState = useCallback(
      (nextViewState: PrismViewState) => {
        const currentViewState = viewStateRef.current;
        if (
          currentViewState.hasEnteredZoom === nextViewState.hasEnteredZoom &&
          currentViewState.hasRotationDrifted ===
            nextViewState.hasRotationDrifted
        ) {
          return;
        }
        viewStateRef.current = nextViewState;
        onViewStateChange?.(nextViewState);
      },
      [onViewStateChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        recentreView() {
          controlsRef.current?.reset();
          publishViewState({
            hasEnteredZoom: viewStateRef.current.hasEnteredZoom,
            hasRotationDrifted: false,
          });
        },
      }),
      [publishViewState],
    );

    return (
      <section
        aria-label="Interactive prism stage"
        className={cn("relative size-full", className)}
      >
        <Canvas
          className="size-full"
          dpr={[1, 2]}
          fallback={
            <p className="m-0 grid size-full place-items-center text-foreground">
              This prism requires WebGL.
            </p>
          }
          gl={{ alpha: true, antialias: true }}
          legacy
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.outputColorSpace = SRGBColorSpace;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
            gl.useLegacyLights = true;
          }}
        >
          <PerspectiveCamera
            makeDefault
            fov={50}
            near={0.1}
            far={100}
            position={[0, 0, 3]}
          />
          <directionalLight
            color={0xffffff}
            intensity={1.1}
            position={[0.6, 1.2, 2.7881]}
          />
          <directionalLight
            color={0xffffff}
            intensity={0.3}
            position={[-3, -1, 1]}
          />
          <ambientLight color={0xffffff} intensity={0.5} />
          <Suspense fallback={null}>
            <PrismScene state={state} />
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            enablePan={false}
            dampingFactor={0.08}
            minDistance={1.2}
            maxDistance={6}
            minPolarAngle={Math.PI / 2}
            maxPolarAngle={Math.PI / 2}
            onChange={() => {
              if (!viewStateRef.current.hasEnteredZoom) return;
              const azimuth = controlsRef.current?.getAzimuthalAngle() ?? 0;
              publishViewState({
                hasEnteredZoom: true,
                hasRotationDrifted:
                  Math.abs(azimuth) > CENTERED_AZIMUTH_EPSILON,
              });
            }}
            onStart={() => {
              publishViewState({
                ...viewStateRef.current,
                hasEnteredZoom: true,
              });
            }}
            target={[0, 0, 0]}
          />
        </Canvas>
      </section>
    );
  },
);

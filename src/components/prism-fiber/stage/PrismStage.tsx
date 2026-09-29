"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  forwardRef,
  Suspense,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type MutableRefObject,
} from "react";
import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  SRGBColorSpace,
} from "three";

import { cn } from "../../ui/utils";
import { PrismScene } from "../scene/PrismScene";
import type { PrismState } from "../state/prism-state";
import {
  calculatePrismHomeView,
  type PrismHomeFrame,
} from "./prism-home-frame";

export interface PrismStageProps {
  state: PrismState;
  homeFrame?: PrismHomeFrame;
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
const DEFAULT_CAMERA_DISTANCE = 3;

interface PrismHomeCameraProps {
  controlsRef: MutableRefObject<ComponentRef<typeof OrbitControls> | null>;
  homeFrame?: PrismHomeFrame;
  homeViewRef: MutableRefObject<(() => void) | null>;
  viewStateRef: MutableRefObject<PrismViewState>;
}

function PrismHomeCamera({
  controlsRef,
  homeFrame,
  homeViewRef,
  viewStateRef,
}: PrismHomeCameraProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const homeView = useMemo(
    () =>
      homeFrame
        ? calculatePrismHomeView(
            homeFrame,
            size.height > 0 ? size.width / size.height : 1,
          )
        : undefined,
    [homeFrame, size.height, size.width],
  );

  useLayoutEffect(() => {
    const perspectiveCamera = camera as PerspectiveCamera;
    if (!perspectiveCamera.isPerspectiveCamera) return;

    const applyProjection = () => {
      if (size.width <= 0 || size.height <= 0) return;
      if (homeView) {
        perspectiveCamera.setViewOffset(
          size.width,
          size.height,
          homeView.viewOffsetX * size.width,
          homeView.viewOffsetY * size.height,
          size.width,
          size.height,
        );
      } else {
        perspectiveCamera.clearViewOffset();
      }
    };
    const applyHomeView = () => {
      applyProjection();
      perspectiveCamera.position.set(
        0,
        0,
        homeView?.distance ?? DEFAULT_CAMERA_DISTANCE,
      );
      const controls = controlsRef.current;
      controls?.target.set(0, 0, 0);
      controls?.update();
      controls?.saveState();
    };

    applyProjection();
    homeViewRef.current = applyHomeView;
    if (!viewStateRef.current.hasEnteredZoom) applyHomeView();

    return () => {
      if (homeViewRef.current === applyHomeView) homeViewRef.current = null;
    };
  }, [camera, controlsRef, homeView, homeViewRef, size.height, size.width, viewStateRef]);

  return null;
}

export const PrismStage = forwardRef<PrismStageHandle, PrismStageProps>(
  function PrismStage(
    { state, homeFrame, onViewStateChange, className = "" },
    ref,
  ) {
    const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
    const homeViewRef = useRef<(() => void) | null>(null);
    const viewStateRef = useRef<PrismViewState>({
      hasEnteredZoom: false,
      hasRotationDrifted: false,
    });
    const [presentationTarget, setPresentationTarget] = useState(() => ({
      state,
      viewAzimuthYRad: 0,
    }));

    useLayoutEffect(() => {
      if (presentationTarget.state === state) return;

      setPresentationTarget({
        state,
        viewAzimuthYRad:
          controlsRef.current?.getAzimuthalAngle() ?? 0,
      });
    }, [presentationTarget.state, state]);
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
          if (homeFrame) {
            homeViewRef.current?.();
          } else {
            controlsRef.current?.reset();
          }
          publishViewState({
            hasEnteredZoom: viewStateRef.current.hasEnteredZoom,
            hasRotationDrifted: false,
          });
          setPresentationTarget({ state, viewAzimuthYRad: 0 });
        },
      }),
      [homeFrame, publishViewState, state],
    );

    return (
      <section
        aria-label="Interactive prism stage"
        className={cn("relative size-full", className)}
      >
        <Canvas
          camera={{
            far: 100,
            fov: 50,
            near: 0.1,
            position: [0, 0, DEFAULT_CAMERA_DISTANCE],
          }}
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
            <PrismScene
              state={presentationTarget.state}
              viewAzimuthYRad={presentationTarget.viewAzimuthYRad}
            />
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
          <PrismHomeCamera
            controlsRef={controlsRef}
            homeFrame={homeFrame}
            homeViewRef={homeViewRef}
            viewStateRef={viewStateRef}
          />
        </Canvas>
      </section>
    );
  },
);

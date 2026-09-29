"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  forwardRef,
  Suspense,
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
  onInteractionStart?: () => void;
  className?: string;
}

export interface PrismStageHandle {
  recentreView(): void;
}

const DEFAULT_CAMERA_DISTANCE = 3;

interface PrismHomeCameraProps {
  controlsRef: MutableRefObject<ComponentRef<typeof OrbitControls> | null>;
  hasInteractedRef: MutableRefObject<boolean>;
  homeFrame?: PrismHomeFrame;
  homeViewRef: MutableRefObject<(() => void) | null>;
}

function PrismHomeCamera({
  controlsRef,
  hasInteractedRef,
  homeFrame,
  homeViewRef,
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
    if (!hasInteractedRef.current) applyHomeView();

    return () => {
      if (homeViewRef.current === applyHomeView) homeViewRef.current = null;
    };
  }, [
    camera,
    controlsRef,
    hasInteractedRef,
    homeView,
    homeViewRef,
    size.height,
    size.width,
  ]);

  return null;
}

export const PrismStage = forwardRef<PrismStageHandle, PrismStageProps>(
  function PrismStage(
    { state, homeFrame, onInteractionStart, className = "" },
    ref,
  ) {
    const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
    const hasInteractedRef = useRef(false);
    const homeViewRef = useRef<(() => void) | null>(null);
    const [presentationTarget, setPresentationTarget] = useState(() => ({
      state,
      viewAzimuthYRad: 0,
    }));

    useLayoutEffect(() => {
      if (presentationTarget.state === state) return;

      setPresentationTarget({
        state,
        viewAzimuthYRad: controlsRef.current?.getAzimuthalAngle() ?? 0,
      });
    }, [presentationTarget.state, state]);
    useImperativeHandle(
      ref,
      () => ({
        recentreView() {
          if (homeFrame) {
            homeViewRef.current?.();
          } else {
            controlsRef.current?.reset();
          }
          setPresentationTarget({ state, viewAzimuthYRad: 0 });
        },
      }),
      [homeFrame, state],
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
            onStart={() => {
              hasInteractedRef.current = true;
              onInteractionStart?.();
            }}
            target={[0, 0, 0]}
          />
          <PrismHomeCamera
            controlsRef={controlsRef}
            hasInteractedRef={hasInteractedRef}
            homeFrame={homeFrame}
            homeViewRef={homeViewRef}
          />
        </Canvas>
      </section>
    );
  },
);

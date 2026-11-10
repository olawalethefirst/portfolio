"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Float32BufferAttribute,
  Box3,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Sphere,
  PerspectiveCamera,
  Vector3,
  type Object3D,
} from "three";

import { cn } from "../ui/utils";
import { getRotationSafeScale } from "./device-framing";

export type ProjectPlatform = "mobile" | "web";
export type ModelRotation = readonly [x: number, y: number, z: number];

export interface ModelEntryRotation {
  initial: ModelRotation;
  visible: ModelRotation;
}

export interface ProjectDeviceStageProps {
  name: string;
  platform: ProjectPlatform;
  screenTextureSrc?: string;
  modelEntryRotation?: ModelEntryRotation;
  isVisible?: boolean;
  reduceMotion?: boolean;
  className?: string;
}

interface DeviceProfile {
  assetPath: string;
  baseScale: number;
  missingScreenError: string;
  needsPlanarScreenUvs: boolean;
  screenMeshName: string;
  textureRotation?: number;
}

const deviceProfiles: Record<ProjectPlatform, DeviceProfile> = {
  mobile: {
    assetPath: "/project_mobile.glb",
    baseScale: 0.214,
    missingScreenError:
      "The mobile project model does not contain its screen mesh.",
    needsPlanarScreenUvs: true,
    screenMeshName: "Object_18",
  },
  web: {
    assetPath: "/project_laptop.glb",
    baseScale: 0.684,
    missingScreenError: "The web project model does not contain a Screen mesh.",
    needsPlanarScreenUvs: false,
    screenMeshName: "Screen",
    textureRotation: Math.PI / 2,
  },
};

function ResponsiveDevicePresentation({
  children,
  platform,
}: PropsWithChildren<{ platform: ProjectPlatform }>) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const camera = useThree((state) => state.camera);
  const model = useGLTF(deviceProfiles[platform].assetPath);
  const { radius, center } = useMemo(
    () => {
      const bounds = new Box3().setFromObject(model.scene, true);
      return {
        radius: bounds.getBoundingSphere(new Sphere()).radius,
        center: bounds.getCenter(new Vector3()).negate(),
      };
    },
    [model.scene],
  );
  const responsiveMultiplier =
    width >= 1280 ? 1.1 : width >= 768 ? 0.95 : 0.6;

  const scale = getRotationSafeScale({
    radius,
    distance: camera.position.length(),
    fov: camera instanceof PerspectiveCamera ? camera.getEffectiveFOV() : 35,
    aspect: height > 0 ? width / height : 0,
    preferredScale: deviceProfiles[platform].baseScale * responsiveMultiplier,
  });

  return (
    <group scale={scale}>
      <group position={center}>{children}</group>
    </group>
  );
}

function cloneModelScene(source: Object3D) {
  return source.clone(true);
}

const zeroRotation: ModelRotation = [0, 0, 0];
const rotationDamping = 1.5;
const rotationEpsilon = 0.001;
const maxRotationDelta = 1 / 30;

function EntryRotationGroup({
  children,
  isVisible = false,
  reduceMotion = false,
  rotation,
}: PropsWithChildren<{
  isVisible?: boolean;
  reduceMotion?: boolean;
  rotation?: ModelEntryRotation;
}>) {
  const groupRef = useRef<Group>(null);
  const transitionPending = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  const hasRotation = Boolean(rotation);
  const targetRotation = rotation
    ? reduceMotion || isVisible
      ? rotation.visible
      : rotation.initial
    : zeroRotation;
  const [startingRotation] = useState<ModelRotation>(() =>
    rotation
      ? reduceMotion
        ? rotation.visible
        : rotation.initial
      : zeroRotation,
  );
  const [targetX, targetY, targetZ] = targetRotation;

  useLayoutEffect(() => {
    const group = groupRef.current;

    if (group && reduceMotion) {
      group.rotation.set(targetX, targetY, targetZ);
    }

    transitionPending.current = hasRotation && !reduceMotion;
    invalidate();
  }, [hasRotation, invalidate, reduceMotion, targetX, targetY, targetZ]);

  useFrame((_, delta) => {
    const group = groupRef.current;

    if (!group || !hasRotation || reduceMotion) {
      return;
    }

    if (transitionPending.current) {
      transitionPending.current = false;
      invalidate();
      return;
    }

    const safeDelta = Math.min(delta, maxRotationDelta);

    const nextX = MathUtils.damp(
      group.rotation.x,
      targetX,
      rotationDamping,
      safeDelta,
    );
    const nextY = MathUtils.damp(
      group.rotation.y,
      targetY,
      rotationDamping,
      safeDelta,
    );
    const nextZ = MathUtils.damp(
      group.rotation.z,
      targetZ,
      rotationDamping,
      safeDelta,
    );
    const isSettled =
      Math.abs(nextX - targetX) < rotationEpsilon &&
      Math.abs(nextY - targetY) < rotationEpsilon &&
      Math.abs(nextZ - targetZ) < rotationEpsilon;

    group.rotation.set(
      isSettled ? targetX : nextX,
      isSettled ? targetY : nextY,
      isSettled ? targetZ : nextZ,
    );

    if (!isSettled) {
      invalidate();
    }
  });

  return (
    <group ref={groupRef} rotation={startingRotation}>
      {children}
    </group>
  );
}

function UntexturedDeviceModel({
  platform,
}: Pick<ProjectDeviceStageProps, "platform">) {
  const model = useGLTF(deviceProfiles[platform].assetPath);
  const scene = useMemo(() => cloneModelScene(model.scene), [model.scene]);

  return <primitive dispose={null} object={scene} />;
}

function findScreenMesh(scene: Object3D, name: string) {
  const screenRoot = scene.getObjectByName(name);
  const screenMesh = screenRoot?.getObjectByProperty("isMesh", true);

  return screenMesh instanceof Mesh ? screenMesh : null;
}

function addPlanarScreenUvs(screenMesh: Mesh) {
  const geometry = screenMesh.geometry.clone();
  const positions = geometry.getAttribute("position");

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;

  if (!bounds) {
    geometry.dispose();
    throw new Error("The mobile project screen does not have valid bounds.");
  }

  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;

  if (width === 0 || height === 0) {
    geometry.dispose();
    throw new Error("The mobile project screen cannot be planar-mapped.");
  }

  const uvs = new Float32Array(positions.count * 2);

  for (let index = 0; index < positions.count; index += 1) {
    uvs[index * 2] = (positions.getX(index) - bounds.min.x) / width;
    uvs[index * 2 + 1] = (positions.getY(index) - bounds.min.y) / height;
  }

  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  screenMesh.geometry = geometry;

  return geometry;
}

function TexturedDeviceModel({
  platform,
  screenTextureSrc,
}: {
  platform: ProjectPlatform;
  screenTextureSrc: string;
}) {
  const deviceProfile = deviceProfiles[platform];
  const model = useGLTF(deviceProfile.assetPath);
  const texture = useTexture(screenTextureSrc);
  const { scene, screenGeometry, screenMaterial, screenTexture } = useMemo(() => {
    const nextScene = cloneModelScene(model.scene);
    const screenMesh = findScreenMesh(
      nextScene,
      deviceProfile.screenMeshName,
    );

    if (!screenMesh) {
      throw new Error(deviceProfile.missingScreenError);
    }

    const nextScreenGeometry = deviceProfile.needsPlanarScreenUvs
      ? addPlanarScreenUvs(screenMesh)
      : undefined;
    const nextScreenTexture = texture.clone();
    nextScreenTexture.colorSpace = SRGBColorSpace;
    if (deviceProfile.textureRotation !== undefined) {
      nextScreenTexture.center.set(0.5, 0.5);
      nextScreenTexture.rotation = deviceProfile.textureRotation;
    }
    nextScreenTexture.needsUpdate = true;

    const nextScreenMaterial = new MeshBasicMaterial({
      map: nextScreenTexture,
      toneMapped: false,
    });
    screenMesh.material = nextScreenMaterial;

    return {
      scene: nextScene,
      screenGeometry: nextScreenGeometry,
      screenMaterial: nextScreenMaterial,
      screenTexture: nextScreenTexture,
    };
  }, [deviceProfile, model.scene, texture]);

  useEffect(
    () => () => {
      screenGeometry?.dispose();
      screenMaterial.dispose();
      screenTexture.dispose();
    },
    [screenGeometry, screenMaterial, screenTexture],
  );

  return <primitive dispose={null} object={scene} />;
}

function ProjectDeviceModel({
  platform,
  screenTextureSrc,
}: Pick<ProjectDeviceStageProps, "platform" | "screenTextureSrc">) {
  if (screenTextureSrc) {
    return (
      <TexturedDeviceModel
        platform={platform}
        screenTextureSrc={screenTextureSrc}
      />
    );
  }

  return <UntexturedDeviceModel platform={platform} />;
}

export function ProjectDeviceStage({
  name,
  platform,
  screenTextureSrc,
  modelEntryRotation,
  isVisible,
  reduceMotion,
  className,
}: ProjectDeviceStageProps) {
  return (
    <figure
      aria-label={`${name} ${platform} project preview`}
      className={cn("size-full", className)}
    >
      <Canvas
        aria-hidden="true"
        camera={{ far: 1000, fov: 35, near: 0.1, position: [0, 0, 8] }}
        className="size-full"
        dpr={[1, 2]}
        fallback={
          <p className="grid size-full place-items-center text-sm text-muted">
            3D project preview unavailable.
          </p>
        }
        frameloop="demand"
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight intensity={2.2} position={[4, 6, 8]} />
        <directionalLight intensity={0.8} position={[-4, 2, 4]} />
        <Suspense fallback={null}>
          <EntryRotationGroup
            isVisible={isVisible}
            reduceMotion={reduceMotion}
            rotation={modelEntryRotation}
          >
            <ResponsiveDevicePresentation platform={platform}>
              <ProjectDeviceModel
                platform={platform}
                screenTextureSrc={screenTextureSrc}
              />
            </ResponsiveDevicePresentation>
          </EntryRotationGroup>
        </Suspense>
      </Canvas>
    </figure>
  );
}

useGLTF.preload(deviceProfiles.mobile.assetPath);
useGLTF.preload(deviceProfiles.web.assetPath);

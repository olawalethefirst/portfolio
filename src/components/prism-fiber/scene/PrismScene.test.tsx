import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const scene = vi.hoisted(() => {
  const assets = new Map<string, object>();
  const textures = new Map<string, object>();
  const controller = {
    advance: vi.fn(),
    isTransitioning: vi.fn(() => false),
    snap: vi.fn(),
    transitionTo: vi.fn(),
  };
  const built = {
    channels: {},
    applyAppearance: vi.fn(),
    dispose: vi.fn(),
    root: {},
  };

  return { assets, built, controller, textures };
});

vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
}));

vi.mock("@react-three/drei", () => {
  const useGLTF = Object.assign(
    (path: string) => {
      if (!scene.assets.has(path)) scene.assets.set(path, {});
      return { scene: scene.assets.get(path) };
    },
    { preload: vi.fn() },
  );
  const useTexture = (path: string) => {
    if (!scene.textures.has(path)) scene.textures.set(path, {});
    return scene.textures.get(path);
  };

  return { useGLTF, useTexture };
});

vi.mock("../motion/prism-transition", () => ({
  createPrismTransitionController: vi.fn(() => scene.controller),
}));

vi.mock("./PrismStructure", () => ({
  buildPrismStructure: vi.fn(() => scene.built),
}));

import { buildPrismStructure } from "./PrismStructure";
import { PrismScene } from "./PrismScene";
import { setGlobalMode } from "@/src/theme/active-theme";

describe("PrismScene", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adapts modes without rebuilding or restarting the active semantic transition", () => {
    document.documentElement.dataset.mode = "dark";
    const { rerender } = render(<PrismScene state="idea" />);
    rerender(<PrismScene state="solution" />);
    act(() => setGlobalMode("light"));
    expect(scene.built.applyAppearance).toHaveBeenLastCalledWith({
      backingColor: 0x000000, backingOpacity: 0.1, figureLightIntensity: 2,
    });
    expect(buildPrismStructure).toHaveBeenCalledTimes(1);
    expect(scene.controller.snap).toHaveBeenCalledTimes(1);
    expect(scene.controller.transitionTo).toHaveBeenCalledTimes(1);
    expect(scene.built.dispose).not.toHaveBeenCalled();
    act(() => setGlobalMode("dark"));
    expect(scene.built.applyAppearance).toHaveBeenLastCalledWith({
      backingColor: 0xffffff, backingOpacity: 0.1, figureLightIntensity: 1,
    });
  });

  it("transitions one persistent scene with the sampled presentation target", () => {
    const { rerender, unmount } = render(
      <PrismScene state="idea" viewAzimuthYRad={0.25} />,
    );

    expect(scene.controller.snap).toHaveBeenCalledWith({
      state: "idea",
      viewAzimuthYRad: 0.25,
    });

    rerender(<PrismScene state="solution" viewAzimuthYRad={0.25} />);

    expect(scene.controller.transitionTo).toHaveBeenLastCalledWith({
      state: "solution",
      viewAzimuthYRad: 0.25,
    });
    expect(buildPrismStructure).toHaveBeenCalledTimes(1);

    unmount();
    expect(scene.built.dispose).toHaveBeenCalledTimes(1);
  });
});

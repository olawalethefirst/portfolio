import { StrictMode, Suspense } from "react";
import { Group, MeshBasicMaterial, Texture } from "three";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const scene = await vi.hoisted(async () => {
  const { Group } = await import("three");
  const assets = new Map<string, object>();
  const textures = new Map<string, object>();
  const controller = {
    advance: vi.fn(),
    isTransitioning: vi.fn(() => false),
    snap: vi.fn(),
    transitionTo: vi.fn(),
  };
  const built = {
    channels: {
      prismRotation: { snap: vi.fn(), beginTransition: vi.fn(), update: vi.fn() },
      figurePose: { snap: vi.fn(), beginTransition: vi.fn(), update: vi.fn() },
      monitorOpacity: { snap: vi.fn(), beginTransition: vi.fn(), update: vi.fn() },
    },
    applyAppearance: vi.fn(),
    applyNotePalette: vi.fn(),
    applyMonitorTexture: vi.fn(),
    dispose: vi.fn(),
    root: new Group(),
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

vi.mock("./prism-accent-palette", () => ({ readPrismAccentPalette: () => ({ accent: "#123456", notes: ["#aaaaaa", "#123456", "#111111"] }) }));
vi.mock("./monitor-accent", async importOriginal => {
  const actual = await importOriginal<typeof import("./monitor-accent")>();
  return { ...actual, loadMonitorAccent: vi.fn(async () => new Texture()) };
});

import { loadMonitorAccent } from "./monitor-accent";
import { buildPrismStructure } from "./PrismStructure";
import { PrismScene } from "./PrismScene";
import { setGlobalTheme, setGlobalMode } from "@/src/theme/active-theme";

describe("PrismScene", () => {
  it("does not build GPU resources for a render that cannot commit", () => {
    const pending = new Promise<void>(() => {});
    function PendingSibling(): never { throw pending; }
    const { unmount } = render(<Suspense fallback={<span>Loading</span>}><PrismScene state="idea" /><PendingSibling /></Suspense>);
    expect(buildPrismStructure).not.toHaveBeenCalled();
    unmount();
  });
  it("attaches a fresh live graph after Strict Mode replay and disposes each once", () => {
    const graphs: { root: Group; disposed: boolean; releases: number }[] = [];
    vi.mocked(buildPrismStructure).mockImplementation(() => {
      const material = new MeshBasicMaterial();
      const graph = { root: new Group(), disposed: false, releases: 0 };
      material.addEventListener("dispose", () => { graph.disposed = true; graph.releases++; });
      graphs.push(graph);
      return { ...scene.built, root: graph.root, dispose: () => material.dispose() };
    });
    const { unmount } = render(<StrictMode><PrismScene state="idea" /></StrictMode>);
    const attached = graphs.filter(graph => graph.root.parent !== null);
    expect(attached).toHaveLength(1);
    expect(attached[0].disposed).toBe(false);
    expect(graphs.filter(graph => graph.disposed)).toHaveLength(1);
    unmount();
    expect(graphs.every(graph => graph.root.parent === null && graph.releases === 1)).toBe(true);
    vi.mocked(buildPrismStructure).mockImplementation(() => scene.built);
  });
  it("updates accents without rebuilding or replaying motion, and ignores mode-only changes", async () => {
    const { rerender } = render(<PrismScene state="idea" />);
    rerender(<PrismScene state="solution" />);
    await act(async () => { setGlobalTheme("copper"); });
    expect(scene.built.applyNotePalette).toHaveBeenCalled();
    expect(scene.built.applyMonitorTexture).toHaveBeenCalled();
    const loads = vi.mocked(loadMonitorAccent).mock.calls.length;
    act(() => setGlobalMode("dark"));
    expect(loadMonitorAccent).toHaveBeenCalledTimes(loads);
    expect(buildPrismStructure).toHaveBeenCalledTimes(1);
    expect(scene.controller.snap).toHaveBeenCalledTimes(1);
    expect(scene.controller.transitionTo).toHaveBeenCalledTimes(1);
  });
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
      board: { faceColor: 0xf8f6ef, frameColor: 0x626a71, backColor: 0x454b50 },
    });
    expect(buildPrismStructure).toHaveBeenCalledTimes(1);
    expect(scene.controller.snap).toHaveBeenCalledTimes(1);
    expect(scene.controller.transitionTo).toHaveBeenCalledTimes(1);
    expect(scene.built.dispose).not.toHaveBeenCalled();
    act(() => setGlobalMode("dark"));
    expect(scene.built.applyAppearance).toHaveBeenLastCalledWith({
      backingColor: 0xffffff, backingOpacity: 0.1, figureLightIntensity: 1,
      board: { faceColor: 0xf2f0e9, frameColor: 0x555b61, backColor: 0x42474c },
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

import { readFileSync } from "node:fs";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { expect, it } from "vitest";

import { createOwnedResources, requireMesh } from "../scene-utils";
import { buildKeyboardReplacement } from "./KeyboardObject";

async function loadAsset(path: string) {
  const bytes = readFileSync(path);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return (await new GLTFLoader().parseAsync(buffer, "")).scene;
}

it("fits the actual keyboard to the desk with its spacebar facing away from the monitor", async () => {
  const office = await loadAsset("public/prism-assets/office.glb");
  const keyboard = await loadAsset("public/keyboard.glb");
  office.updateMatrixWorld(true);
  const reference = requireMesh(office, /^keyboard_keyboard/i);
  const desktop = requireMesh(office, /^table_table_top/i);
  const resources = createOwnedResources();
  try {
    const replacement = buildKeyboardReplacement(keyboard, reference, desktop, resources);
    replacement.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(replacement);
    const target = new Box3().setFromObject(reference);
    expect(bounds.getSize(new Vector3()).z).toBeCloseTo(target.getSize(new Vector3()).z);
    expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(target.getCenter(new Vector3()).x);
    expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(target.getCenter(new Vector3()).z);
    expect(bounds.min.y).toBeCloseTo(new Box3().setFromObject(desktop).max.y + 0.005);
    // Object_80 is the wide spacebar; Object_98 is a key on the opposite row.
    const spacebar = new Box3().setFromObject(requireMesh(replacement, /^Object_80$/)).getCenter(new Vector3());
    const topRow = new Box3().setFromObject(requireMesh(replacement, /^Object_98$/)).getCenter(new Vector3());
    const monitor = new Box3().setFromObject(requireMesh(office, /^screen_desktop/i)).getCenter(new Vector3());
    expect(spacebar.distanceTo(monitor)).toBeGreaterThan(topRow.distanceTo(monitor));
  } finally {
    resources.dispose();
  }
});

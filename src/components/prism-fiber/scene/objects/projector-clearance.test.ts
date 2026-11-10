import { readFileSync } from "node:fs";
import { Box3, Mesh, MeshStandardMaterial, Texture } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { expect, it } from "vitest";

import { buildProjectorObject } from "./ProjectorObject";

it("keeps the projector screen and its overlay inside and clear of the glass backing", async () => {
  const bytes = readFileSync("public/prism-assets/projector.glb");
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const { scene } = await new GLTFLoader().parseAsync(buffer, "");
  const texture = new Texture();
  const built = buildProjectorObject(scene, texture);
  try {
    built.group.updateMatrixWorld(true);
    const bounds = new Box3();
    let surfaceCount = 0;
    built.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const isOverlay = object.material instanceof MeshStandardMaterial && object.material.map;
      if (/Screen_Rilsan/i.test(object.name) || isOverlay) {
        bounds.union(new Box3().setFromObject(object));
        surfaceCount += 1;
      }
    });
    expect(surfaceCount).toBe(2);
    expect(bounds.max.z).toBeLessThan(-0.01);
  } finally {
    built.dispose();
    texture.dispose();
  }
});

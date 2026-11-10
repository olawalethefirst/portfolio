import { describe, expect, it } from "vitest";
import { Euler, PerspectiveCamera, Vector3 } from "three";
import { getRotationSafeScale } from "./device-framing";

describe("rotation-safe project framing", () => {
  it.each([0.3, 1, 2.5])("keeps model corners visible throughout rotation at aspect %s", (aspect) => {
    const camera = new PerspectiveCamera(35, aspect, 0.1, 1000);
    camera.position.set(0, 0, 8);
    camera.updateMatrixWorld();
    const scale = getRotationSafeScale({ radius: Math.hypot(10, 6, 2), distance: 8, fov: 35, aspect, preferredScale: 1 });
    for (let step = 0; step <= 24; step++) {
      const angle = step * Math.PI / 12;
      for (const x of [-10, 10]) for (const y of [-6, 6]) for (const z of [-2, 2]) {
        const projected = new Vector3(x, y, z)
          .multiplyScalar(scale)
          .applyEuler(new Euler(angle, angle / 2, -angle / 3))
          .project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
        expect(Math.abs(projected.z)).toBeLessThan(1);
      }
    }
  });
  it.each([0.3, 1, 2.5])("keeps a rotating model inside both view boundaries at aspect %s", (aspect) => {
    const radius = 12;
    const distance = 8;
    const fov = 35;
    const scale = getRotationSafeScale({ radius, distance, fov, aspect, preferredScale: 1 });
    const angularRadius = Math.asin(radius * scale / distance);
    const verticalHalfAngle = fov * Math.PI / 360;
    const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
    expect(angularRadius).toBeLessThan(verticalHalfAngle);
    expect(angularRadius).toBeLessThan(horizontalHalfAngle);
  });

  it("preserves the existing size when sufficient rotation clearance is available", () => {
    expect(getRotationSafeScale({ radius: 1, distance: 8, fov: 35, aspect: 2, preferredScale: 0.2 })).toBe(0.2);
  });

  it("returns zero for an unmeasured viewport or degenerate model", () => {
    expect(getRotationSafeScale({ radius: 1, distance: 8, fov: 35, aspect: 0, preferredScale: 1 })).toBe(0);
    expect(getRotationSafeScale({ radius: 0, distance: 8, fov: 35, aspect: 1, preferredScale: 1 })).toBe(0);
  });
});

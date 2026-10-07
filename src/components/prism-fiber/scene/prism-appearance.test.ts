import { MeshPhysicalMaterial, SpotLight } from "three";
import { describe, expect, it } from "vitest";
import { applyPrismAppearance, resolvePrismAppearance } from "./prism-appearance";

describe("Prism mode appearance", () => {
  it("updates owned tint and lighting in both directions without changing other settings", () => {
    const backing = new MeshPhysicalMaterial({ roughness: 0.3 });
    const light = new SpotLight(0xfff0e0, 1, 0.75, 1.2, 0.6, 0);
    const otherBacking = new MeshPhysicalMaterial({ color: 0xffffff });
    const otherLight = new SpotLight(0xfff0e0, 1);
    applyPrismAppearance(backing, light, resolvePrismAppearance("light"));
    expect(backing.color.getHex()).toBe(0x000000);
    expect(backing.opacity).toBe(0.1);
    expect(light.intensity).toBe(2);
    expect(otherBacking.color.getHex()).toBe(0xffffff);
    expect(otherLight.intensity).toBe(1);
    applyPrismAppearance(backing, light, resolvePrismAppearance("dark"));
    expect(backing.color.getHex()).toBe(0xffffff);
    expect(light.intensity).toBe(1);
    expect(light.color.getHex()).toBe(0xfff0e0);
    expect(light.distance).toBe(0.75);
    expect(backing.roughness).toBe(0.3);
    backing.dispose();
    otherBacking.dispose();
  });
});

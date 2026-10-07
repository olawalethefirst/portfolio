import type { MeshPhysicalMaterial, SpotLight } from "three";
import type { ThemeMode } from "@/src/theme/theme";

export interface PrismAppearance {
  readonly backingColor: number;
  readonly backingOpacity: number;
  readonly figureLightIntensity: number;
}

const appearances: Record<ThemeMode, PrismAppearance> = {
  dark: { backingColor: 0xffffff, backingOpacity: 0.1, figureLightIntensity: 1 },
  light: { backingColor: 0x000000, backingOpacity: 0.1, figureLightIntensity: 2 },
};

export function resolvePrismAppearance(mode: ThemeMode): PrismAppearance {
  return appearances[mode];
}

export function applyPrismAppearance(
  backing: MeshPhysicalMaterial,
  light: SpotLight,
  appearance: PrismAppearance,
) {
  backing.color.setHex(appearance.backingColor);
  backing.opacity = appearance.backingOpacity;
  light.intensity = appearance.figureLightIntensity;
}

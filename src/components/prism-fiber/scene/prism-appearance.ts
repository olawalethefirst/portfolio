import type { MeshPhysicalMaterial, SpotLight } from "three";
import type { ThemeMode } from "@/src/theme/theme";

export interface PrismAppearance {
  readonly board: BoardAppearance;
  readonly backingColor: number;
  readonly backingOpacity: number;
  readonly figureLightIntensity: number;
}

export interface BoardAppearance {
  readonly faceColor: number;
  readonly frameColor: number;
  readonly backColor: number;
}

const appearances: Record<ThemeMode, PrismAppearance> = {
  dark: {
    backingColor: 0xffffff, backingOpacity: 0.1, figureLightIntensity: 1,
    board: { faceColor: 0xf2f0e9, frameColor: 0x555b61, backColor: 0x42474c },
  },
  light: {
    backingColor: 0x000000, backingOpacity: 0.1, figureLightIntensity: 2,
    board: { faceColor: 0xf8f6ef, frameColor: 0x626a71, backColor: 0x454b50 },
  },
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

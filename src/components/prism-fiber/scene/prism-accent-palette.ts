import { cssColorsToHex } from "@/src/theme/browser-color";

export interface PrismAccentPalette {
  readonly accent: string;
  readonly notes: readonly [string, string, string];
}

export function readPrismAccentPalette(convert?: (color: string) => string): PrismAccentPalette {
  const root = getComputedStyle(document.documentElement);
  const values = ["--prism-note-light", "--prism-note-base", "--prism-note-dark"]
    .map(name => root.getPropertyValue(name).trim());
  const colors = convert ? values.map(convert) : cssColorsToHex(values);
  if (colors.some(hex => !/^#[0-9a-f]{6}$/i.test(hex))) {
    throw new Error("Invalid resolved color in Prism palette");
  }
  const [light, base, dark] = colors;
  return { accent: base, notes: [light, base, dark] };
}

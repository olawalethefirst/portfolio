import type { ThemeName } from "@/src/theme/theme";
import type { BuiltPrismStructure } from "./PrismStructure";
import { readPrismAccentPalette } from "./prism-accent-palette";
import { createMonitorTextureOwner, loadMonitorAccent } from "./monitor-accent";

/** Appearance work has the same lifetime as its committed scene graph. */
export function createPrismAccents(built: BuiltPrismStructure) {
  const monitor = createMonitorTextureOwner(loadMonitorAccent, built.applyMonitorTexture,
    error => console.error("Prism monitor appearance update failed", error));
  let selected: ThemeName | undefined;
  return {
    update(theme: ThemeName) {
      if (selected === theme) return;
      selected = theme;
      try {
        const palette = readPrismAccentPalette();
        built.applyNotePalette(palette.notes);
        void monitor.update(palette.accent);
      } catch (error) {
        console.error("Prism accent palette resolution failed", error);
      }
    },
    dispose: monitor.dispose,
  };
}

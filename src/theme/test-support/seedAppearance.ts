import { defaultAppearanceStore } from "../AppearanceProvider";
import type { AppearanceChoice } from "../appearance";
import { DEFAULT_THEME } from "../theme";

/** Reset the shared store and <html> to a known appearance for a test. */
export function seedAppearance(choice: AppearanceChoice = {}) {
  defaultAppearanceStore.setState({ theme: choice.theme, mode: choice.mode });
  document.documentElement.dataset.theme = choice.theme ?? DEFAULT_THEME.theme;
  document.documentElement.dataset.mode = choice.mode ?? DEFAULT_THEME.mode;
}

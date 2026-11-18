import type { ReactNode } from "react";
import { AppearanceProvider, useAppearance, type Appearance } from "../AppearanceProvider";
import type { AppearanceChoice } from "../appearance";
import { DEFAULT_THEME } from "../theme";

/**
 * A wrapper for RTL's `render` with a real provider, plus a live handle on the
 * current appearance so a test can change it. Also sets <html> as the root
 * layout would for the same starting choice.
 */
export function appearanceHarness(initial: AppearanceChoice = {}) {
  document.documentElement.dataset.theme = initial.theme ?? DEFAULT_THEME.theme;
  document.documentElement.dataset.mode = initial.mode ?? DEFAULT_THEME.mode;
  let latest: Appearance | undefined;
  function Capture() {
    latest = useAppearance();
    return null;
  }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppearanceProvider initial={initial}>
        <Capture />
        {children}
      </AppearanceProvider>
    );
  }
  return {
    Wrapper,
    get current() {
      if (!latest) throw new Error("Render with the harness wrapper first.");
      return latest;
    },
  };
}

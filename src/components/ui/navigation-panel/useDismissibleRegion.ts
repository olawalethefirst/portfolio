import { useEffect } from "react";
import type { RefObject } from "react";

export type DismissReason = "escape" | "outside-press";

interface UseDismissibleRegionOptions<T extends HTMLElement> {
  isEnabled: boolean;
  onDismiss: (reason: DismissReason) => void;
  ref: RefObject<T | null>;
}

export function useDismissibleRegion<T extends HTMLElement>({
  isEnabled,
  onDismiss,
  ref,
}: UseDismissibleRegionOptions<T>) {
  useEffect(() => {
    if (!isEnabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        onDismiss("outside-press");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      onDismiss("escape");
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEnabled, onDismiss, ref]);
}

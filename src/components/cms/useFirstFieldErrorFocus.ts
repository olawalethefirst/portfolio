"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Focus validation feedback in visual field order, after the next render. */
export function useFirstFieldErrorFocus<Field extends string>(
  formRef: RefObject<HTMLFormElement | null>,
  fieldOrder: readonly Field[],
) {
  const frame = useRef<number | null>(null);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return (errors: Partial<Record<Field, string>>) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const first = fieldOrder.find((field) => errors[field]);
    if (!first) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const field = formRef.current?.elements.namedItem(first);
      if (field instanceof HTMLElement) field.focus();
    });
  };
}

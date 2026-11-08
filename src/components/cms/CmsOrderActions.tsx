"use client";

import { Button } from "@/src/components/ui/Button";

export function CmsOrderActions({ name, index, total, disabled, onMove }: {
  name: string;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return <>{([-1, 1] as const).map((direction) => (
    <Button key={direction} variant="ghost"
      aria-label={`Move ${name} ${direction === -1 ? "up" : "down"}`}
      isDisabled={disabled || (direction === -1 ? index === 0 : index === total - 1)}
      onPress={() => onMove(direction)}>
      Move {direction === -1 ? "up" : "down"}
    </Button>
  ))}</>;
}

export function CmsOrderHint() {
  return <p className="mt-2">Order changes apply immediately in this demo. Clear filters to reorder.</p>;
}

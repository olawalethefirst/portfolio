"use client";

import { ProgressBar as HeroUIProgressBar } from "@heroui/react/progress-bar";
import type { ProgressBarProps as HeroUIProgressBarProps } from "@heroui/react/progress-bar";

export type ProgressSize = "xs" | "sm" | "md" | "lg";
export type ProgressColor = "accent" | "default" | "success" | "warning" | "danger";

export interface ProgressProps
  extends Omit<
    HeroUIProgressBarProps,
    | "children"
    | "className"
    | "color"
    | "maxValue"
    | "minValue"
    | "size"
    | "value"
  > {
  value?: number;
  maxValue?: number;
  minValue?: number;
  label?: string;
  isIndeterminate?: boolean;
  size?: ProgressSize;
  color?: ProgressColor;
  className?: string;
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(value, minValue), maxValue);
}

export function Progress({
  value = 0,
  minValue = 0,
  maxValue = 100,
  label,
  isIndeterminate = false,
  size = "md",
  color = "accent",
  className,
  "aria-label": ariaLabel,
  ...props
}: ProgressProps) {
  const normalizedValue = clamp(value, minValue, maxValue);
  const heroUISize = size === "xs" ? "sm" : size;
  const trackClassName = size === "xs" ? "h-0.5" : undefined;

  return (
    <HeroUIProgressBar
      {...props}
      aria-label={ariaLabel ?? label ?? "Progress"}
      className={className}
      color={color}
      maxValue={maxValue}
      minValue={minValue}
      size={heroUISize}
      value={isIndeterminate ? undefined : normalizedValue}
    >
      <HeroUIProgressBar.Track className={trackClassName}>
        <HeroUIProgressBar.Fill />
      </HeroUIProgressBar.Track>
    </HeroUIProgressBar>
  );
}

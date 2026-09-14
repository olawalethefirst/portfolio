"use client";

import { ColorSwatch as HeroUIColorSwatch } from "@heroui/react/color-swatch";
import type { ColorSwatchProps as HeroUIColorSwatchProps } from "@heroui/react/color-swatch";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "./utils";

export type ColorSwatchSize = "sm" | "md" | "lg";
export type ColorSwatchShape = "circle" | "square";

export interface ColorSwatchProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "className" | "color"
  > {
  color: string;
  colorName?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: ColorSwatchSize;
  shape?: ColorSwatchShape;
  className?: string;
}

const heroUISizeBySize: Record<
  ColorSwatchSize,
  NonNullable<HeroUIColorSwatchProps["size"]>
> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

const heroUIShapeByShape: Record<
  ColorSwatchShape,
  NonNullable<HeroUIColorSwatchProps["shape"]>
> = {
  circle: "circle",
  square: "square",
};

function isCssVariable(value: string) {
  return value.trim().startsWith("var(");
}

export function ColorSwatch({
  color,
  colorName,
  isSelected = false,
  isDisabled = false,
  size = "md",
  shape = "circle",
  className,
  style,
  ...props
}: ColorSwatchProps) {
  const resolvedStyle = {
    "--color-swatch-current": color,
    ...style,
  } as CSSProperties;

  if (isCssVariable(color)) {
    return (
      <div
        {...props}
        aria-label={props["aria-label"] ?? colorName ?? color}
        className={cn(
          "color-swatch",
          `color-swatch--${heroUISizeBySize[size]}`,
          `color-swatch--${heroUIShapeByShape[shape]}`,
          className,
        )}
        data-disabled={isDisabled || undefined}
        data-slot="color-swatch"
        data-selected={isSelected || undefined}
        role="img"
        style={resolvedStyle}
      />
    );
  }

  return (
    <HeroUIColorSwatch
      {...props}
      className={className}
      color={color as HeroUIColorSwatchProps["color"]}
      colorName={colorName}
      data-disabled={isDisabled || undefined}
      data-selected={isSelected || undefined}
      shape={heroUIShapeByShape[shape]}
      size={heroUISizeBySize[size]}
      style={resolvedStyle}
    />
  );
}

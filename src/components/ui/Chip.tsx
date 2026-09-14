"use client";

import { Chip as HeroUIChip } from "@heroui/react/chip";
import type { ChipProps as HeroUIChipProps } from "@heroui/react/chip";
import type { ReactNode } from "react";

export type ChipColor = "accent" | "default" | "success" | "warning" | "danger";
export type ChipVariant = "primary" | "secondary" | "soft" | "tertiary";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipProps
  extends Omit<HeroUIChipProps, "children" | "className" | "color" | "size" | "variant"> {
  children: ReactNode;
  color?: ChipColor;
  variant?: ChipVariant;
  size?: ChipSize;
  className?: string;
}

export function Chip({
  children,
  color = "default",
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ChipProps) {
  return (
    <HeroUIChip {...props} className={className} color={color} size={size} variant={variant}>
      {children}
    </HeroUIChip>
  );
}

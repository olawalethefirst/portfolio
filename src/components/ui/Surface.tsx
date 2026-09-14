"use client";

import { Surface as HeroUISurface } from "@heroui/react/surface";
import type { SurfaceProps as HeroUISurfaceProps } from "@heroui/react/surface";
import type { ReactNode } from "react";

import { cn } from "./utils";

export type SurfaceVariant = "primary" | "secondary" | "elevated";
export type SurfaceMaterial = "solid" | "glass";

export interface SurfaceProps
  extends Omit<HeroUISurfaceProps, "children" | "className" | "variant"> {
  children: ReactNode;
  variant?: SurfaceVariant;
  material?: SurfaceMaterial;
  className?: string;
}

const heroUIVariantBySurfaceVariant: Record<
  SurfaceVariant,
  NonNullable<HeroUISurfaceProps["variant"]>
> = {
  primary: "default",
  secondary: "secondary",
  elevated: "tertiary",
};

export function Surface({
  children,
  variant = "primary",
  material = "solid",
  className,
  ...props
}: SurfaceProps) {
  const isGlass = material === "glass";

  return (
    <HeroUISurface
      {...props}
      className={cn(isGlass && "glass-material glass-backdrop", className)}
      variant={isGlass ? "transparent" : heroUIVariantBySurfaceVariant[variant]}
    >
      {children}
    </HeroUISurface>
  );
}

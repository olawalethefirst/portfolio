"use client";

import { Surface as HeroUISurface } from "@heroui/react/surface";
import type { SurfaceProps as HeroUISurfaceProps } from "@heroui/react/surface";
import type { ReactNode } from "react";

export type SurfaceVariant = "primary" | "secondary" | "elevated";

export interface SurfaceProps
  extends Omit<HeroUISurfaceProps, "children" | "className" | "variant"> {
  children: ReactNode;
  variant?: SurfaceVariant;
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
  className,
  ...props
}: SurfaceProps) {
  return (
    <HeroUISurface
      {...props}
      className={className}
      variant={heroUIVariantBySurfaceVariant[variant]}
    >
      {children}
    </HeroUISurface>
  );
}

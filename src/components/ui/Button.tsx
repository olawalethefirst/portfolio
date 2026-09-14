"use client";

import { Button as HeroUIButton } from "@heroui/react/button";
import type { ButtonProps as HeroUIButtonProps } from "@heroui/react/button";
import { Spinner } from "@heroui/react/spinner";
import type { ReactNode } from "react";
import { type IconSlot } from "./utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<
    HeroUIButtonProps,
    | "children"
    | "className"
    | "fullWidth"
    | "isDisabled"
    | "isPending"
    | "size"
    | "variant"
  > {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  startContent?: IconSlot;
  endContent?: IconSlot;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  isDisabled = false,
  startContent,
  endContent,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <HeroUIButton
      {...props}
      type={type}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isDisabled={isDisabled}
      isPending={isLoading}
      aria-busy={isLoading || undefined}
      className={className}
    >
      {isLoading ? (
        <Spinner
          aria-hidden="true"
          color="current"
          data-slot="button-loading-indicator"
          size="sm"
        />
      ) : (
        startContent
      )}
      {children}
      {endContent}
    </HeroUIButton>
  );
}

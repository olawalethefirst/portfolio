"use client";

import { Button as HeroUIButton } from "@heroui/react/button";
import type { ButtonProps as HeroUIButtonProps } from "@heroui/react/button";
import { Spinner } from "@heroui/react/spinner";
import { buttonVariants } from "@heroui/styles";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn, type IconSlot } from "./utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
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

interface ButtonActionProps
  extends ButtonBaseProps,
    Omit<
    HeroUIButtonProps,
    | "children"
    | "className"
    | "fullWidth"
    | "isDisabled"
    | "isPending"
    | "size"
    | "variant"
  > {}

interface ButtonLinkProps
  extends ButtonBaseProps,
    Omit<
      ComponentPropsWithRef<"a">,
      "children" | "className" | "href" | "size"
    > {
  href: string;
}

export type ButtonProps = ButtonActionProps | ButtonLinkProps;

export function Button(props: ButtonProps) {
  if ("href" in props) {
    const {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      isDisabled = false,
      startContent,
      endContent,
      className,
      href,
      ...linkProps
    } = props;
    const isUnavailable = isDisabled || isLoading;

    return (
      <a
        {...linkProps}
        aria-busy={isLoading || undefined}
        aria-disabled={isUnavailable || undefined}
        className={cn(
          buttonVariants({ fullWidth, size, variant }),
          className,
        )}
        data-slot="button"
        href={isUnavailable ? undefined : href}
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
      </a>
    );
  }

  const {
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
    ...buttonProps
  } = props;

  return (
    <HeroUIButton
      {...buttonProps}
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

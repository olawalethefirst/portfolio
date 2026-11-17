"use client";

import { Button as HeroUIButton } from "@heroui/react/button";
import type { ButtonProps as HeroUIButtonProps } from "@heroui/react/button";
import { Spinner } from "@heroui/react/spinner";
import { buttonVariants } from "@heroui/styles";
import Link from "next/link";
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
    const content = (
      <>
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
      </>
    );
    const sharedClassName = cn(
      buttonVariants({ fullWidth, size, variant }),
      "rounded-none",
      className,
    );

    // A disabled/loading link has nowhere to navigate; render a plain,
    // non-interactive anchor rather than asking next/link for a href it can't take.
    if (isUnavailable)
      return (
        <a
          {...linkProps}
          aria-busy={isLoading || undefined}
          aria-disabled
          className={sharedClassName}
          data-slot="button"
        >
          {content}
        </a>
      );

    return (
      <Link {...linkProps} className={sharedClassName} data-slot="button" href={href}>
        {content}
      </Link>
    );
  }

  const {
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    isLoading = false,
    isDisabled = false,
    isIconOnly = false,
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
      isIconOnly={isIconOnly}
      isPending={isLoading}
      aria-busy={isLoading || undefined}
      className={cn(!isIconOnly && "rounded-none", className)}
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

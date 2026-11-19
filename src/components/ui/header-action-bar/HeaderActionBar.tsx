"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode, Ref } from "react";

import { useBack } from "@/src/navigation/useBack";

import { Button } from "../Button";
import { cn } from "../utils";

export interface HeaderActionBarProps {
  /**
   * Overrides the back action, for fixed destinations and in-page closes.
   * Omit it to step back to the previous app page, or to `fallbackHref`.
   */
  onBack?: () => void;
  /** Where the default back action goes when no earlier app page exists. */
  fallbackHref?: string;
  backLabel?: string;
  backDisabled?: boolean;
  backButtonRef?: Ref<HTMLButtonElement>;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  buttonClassName?: string;
}

interface BackButtonProps
  extends Pick<
    HeaderActionBarProps,
    "backLabel" | "backDisabled" | "backButtonRef" | "buttonClassName"
  > {
  onBack: () => void;
}

function BackButton({
  onBack,
  backLabel = "Back",
  backDisabled = false,
  backButtonRef,
  buttonClassName,
}: BackButtonProps) {
  return (
    <Button
      aria-label={backLabel}
      ref={backButtonRef}
      isDisabled={backDisabled}
      isIconOnly
      onPress={onBack}
      variant="tertiary"
      className={buttonClassName}
    >
      <ArrowLeft aria-hidden="true" />
    </Button>
  );
}

// Only mounted without an explicit handler, so bars with their own `onBack`
// never need the router.
function RouteBackButton({
  fallbackHref,
  ...props
}: Omit<BackButtonProps, "onBack"> & { fallbackHref?: string }) {
  return <BackButton {...props} onBack={useBack(fallbackHref)} />;
}

export function HeaderActionBar({
  onBack,
  fallbackHref,
  backLabel,
  backDisabled,
  backButtonRef,
  children,
  actions,
  className,
  buttonClassName
}: HeaderActionBarProps) {
  const buttonProps = { backLabel, backDisabled, backButtonRef, buttonClassName };

  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="w-full">
        {onBack ? (
          <BackButton {...buttonProps} onBack={onBack} />
        ) : (
          <RouteBackButton {...buttonProps} fallbackHref={fallbackHref} />
        )}
      </div>
      {children || actions ? <div className="flex w-full flex-wrap items-start gap-3">
        {children ? <div className="min-w-0 flex-1">{children}</div> : null}
        {actions ? (
          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">{actions}</div>
        ) : null}
      </div> : null}
    </header>
  );
}

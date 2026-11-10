"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode, Ref } from "react";

import { Button } from "../Button";
import { cn } from "../utils";

export interface HeaderActionBarProps {
  onBack: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  backButtonRef?: Ref<HTMLButtonElement>;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  buttonClassName?: string;
}

export function HeaderActionBar({
  onBack,
  backLabel = "Back",
  backDisabled = false,
  backButtonRef,
  children,
  actions,
  className,
  buttonClassName
}: HeaderActionBarProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="w-full">
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

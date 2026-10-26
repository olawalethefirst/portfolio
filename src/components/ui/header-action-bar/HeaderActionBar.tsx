"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../Button";
import { cn } from "../utils";

export interface HeaderActionBarProps {
  onBack: () => void;
  backLabel?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function HeaderActionBar({
  onBack,
  backLabel = "Back",
  children,
  actions,
  className,
}: HeaderActionBarProps) {
  return (
    <header className={cn("flex min-h-24 items-center gap-3", className)}>
      <Button
        aria-label={backLabel}
        isIconOnly
        onPress={onBack}
        variant="tertiary"
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      {children ? <div className="min-w-0 flex-1">{children}</div> : null}
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

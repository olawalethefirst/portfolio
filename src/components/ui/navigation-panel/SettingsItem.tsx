"use client";

import type { ReactNode } from "react";

import { cn } from "../utils";

export interface SettingsItemProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  controlClassName?: string;
}

export function SettingsItem({
  label,
  children,
  className,
  controlClassName,
}: SettingsItemProps) {
  return (
    <div
      className={cn(
        "flex min-h-14 w-full items-center justify-between gap-4 px-4",
        className,
      )}
    >
      <span className="min-w-0 truncate text-sm font-medium text-foreground">
        {label}
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center justify-end",
          controlClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

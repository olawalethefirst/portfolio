"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export interface NavigationItemProps
  extends Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "children" | "className" | "href"
  > {
  label: ReactNode;
  href: string;
  isExternal?: boolean;
  className?: string;
}

export function NavigationItem({
  label,
  href,
  isExternal = false,
  className,
  ...props
}: NavigationItemProps) {
  const Icon = isExternal ? ArrowUpRight : ArrowRight;

  return (
    <a
      {...props}
      className={cn(
        "flex min-h-14 w-full items-center justify-between gap-4 px-4",
        "text-sm font-medium text-foreground outline-none",
        "hover:bg-default/50 active:bg-default focus-visible:bg-default/50",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
        className,
      )}
      href={href}
    >
      <span className="min-w-0 truncate">{label}</span>
      <Icon aria-hidden="true" className="size-5 shrink-0" />
    </a>
  );
}

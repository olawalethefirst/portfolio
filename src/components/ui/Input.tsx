"use client";

import { Input as HeroUIInput, type InputProps as HeroUIInputProps } from "@heroui/react/input";
import type { ReactNode } from "react";

import { fieldClassName } from "./field-styles";
import { cn } from "./utils";

export interface InputProps extends Omit<HeroUIInputProps, "className"> {
  className?: string;
  startContent?: ReactNode;
}

export function Input({ className, startContent, ...props }: InputProps) {
  const input = <HeroUIInput {...props} className={cn(fieldClassName, Boolean(startContent) && "pl-11", className)} />;
  if (!startContent) return input;

  return (
    <div className="relative w-full">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-muted [&>svg]:size-4">
        {startContent}
      </span>
      {input}
    </div>
  );
}

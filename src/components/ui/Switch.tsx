"use client";

import { Switch as HeroUISwitch } from "@heroui/react/switch";
import type { SwitchProps as HeroUISwitchProps } from "@heroui/react/switch";
import type { ReactNode } from "react";
import { cn } from "./utils";

export interface SwitchProps
  extends Omit<
    HeroUISwitchProps,
    "children" | "className" | "onChange" | "size"
  > {
  children: ReactNode;
  onValueChange?: (isSelected: boolean) => void;
  className?: string;
}

export function Switch({
  children,
  onValueChange,
  className,
  ...props
}: SwitchProps) {
  return (
    <HeroUISwitch
      {...props}
      className={cn("group/switch", className)}
      onChange={onValueChange}
    >
      <HeroUISwitch.Content>
        <HeroUISwitch.Control className="h-2.5 overflow-visible ">
          <HeroUISwitch.Thumb className="ms-0.5   group-data-[selected=true]/switch:ms-[calc(100%-1.375rem)]" />
        </HeroUISwitch.Control>
        {children}
      </HeroUISwitch.Content>
    </HeroUISwitch>
  );
}

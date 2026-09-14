"use client";

import { Tabs } from "@heroui/react/tabs";
import type { TabsProps as HeroUITabsProps } from "@heroui/react/tabs";
import type { Key, ReactNode } from "react";

export type SegmentControlVariant = "primary" | "secondary";

export interface SegmentControlItem {
  value: string;
  label: ReactNode;
  isDisabled?: boolean;
  href?: string;
}

export interface SegmentControlProps
  extends Omit<
    HeroUITabsProps,
    | "children"
    | "className"
    | "defaultSelectedKey"
    | "onSelectionChange"
    | "selectedKey"
    | "variant"
  > {
  items: SegmentControlItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: SegmentControlVariant;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
}

export function SegmentControl({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = "primary",
  className,
  listClassName,
  tabClassName,
  orientation = "horizontal",
  "aria-label": ariaLabel = "Segment control",
  ...props
}: SegmentControlProps) {
  return (
    <Tabs
      {...props}
      aria-label={ariaLabel}
      className={className}
      defaultSelectedKey={defaultValue}
      onSelectionChange={(key: Key) => onValueChange?.(String(key))}
      orientation={orientation}
      selectedKey={value}
      variant={variant}
    >
      <Tabs.ListContainer>
        <Tabs.List className={listClassName}>
          {items.map((item, index) => (
            <Tabs.Tab
              key={item.value}
              href={item.href}
              id={item.value}
              isDisabled={item.isDisabled}
              className={tabClassName}
            >
              {index > 0 && <Tabs.Separator />}
              <Tabs.Indicator />
              {item.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

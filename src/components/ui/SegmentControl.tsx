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

/**
 * Sentinel for `defaultValue` on every SegmentControl after the first on a page.
 *
 * HeroUI's selection indicator mispositions itself on every instance after the
 * first, offsetting it vertically by a cumulative 16 pixels per preceding
 * instance until the user changes tabs. The defect is upstream and reproduces
 * with raw HeroUI `Tabs`, so it is handled by convention rather than here.
 *
 * Passing a `defaultValue` that matches no item avoids it. React Aria then falls
 * back to selecting the first tab, so the control still renders with a segment
 * selected and the indicator in the right place.
 *
 * See `docs/decisions/0002-segment-control-indicator-offset.md`.
 */
export const SEGMENT_CONTROL_NO_DEFAULT = "null";

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
  /**
   * Uncontrolled initial selection.
   *
   * On a page with more than one SegmentControl, pass
   * `SEGMENT_CONTROL_NO_DEFAULT` for every control after the first. A value
   * matching no item sidesteps the upstream indicator offset described on that
   * constant; React Aria falls back to the first tab, so the control still shows
   * a selected segment.
   *
   * Note that the fallback is internal to the tab state: `onValueChange` does
   * not fire for it, so a consumer tracking the selection separately will not
   * see a value until the user picks one.
   */
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

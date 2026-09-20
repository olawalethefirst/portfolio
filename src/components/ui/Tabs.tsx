"use client";

export { Tabs } from "@heroui/react/tabs";
export type {
  TabIndicatorProps,
  TabListContainerProps,
  TabListProps,
  TabPanelProps,
  TabProps,
  TabSeparatorProps,
  TabsProps,
} from "@heroui/react/tabs";

/**
 * Sentinel for `defaultSelectedKey` on every uncontrolled Tabs instance after
 * the first.
 *
 * See `docs/decisions/0002-tabs-indicator-offset.md`.
 */
export const TABS_NO_DEFAULT = "null";

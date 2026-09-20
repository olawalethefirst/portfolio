"use client";

import { ColorSwatchPicker } from "../ColorSwatchPicker";
import { Slider } from "../Slider";
import { Surface } from "../Surface";
import { Switch } from "../Switch";
import { Tabs } from "../Tabs";
import { NavigationItem } from "./NavigationItem";
import { SettingsItem } from "./SettingsItem";
import type { NavigationPanelView } from "./state";

export type ThemeMode = "light" | "dark";

export interface NavigationPanelLink {
  href: string;
  label: string;
  isExternal?: boolean;
}

export interface NavigationPanelThemeOption {
  color?: string;
  label: string;
}

interface NavigationPanelContentProps {
  view: NavigationPanelView;
  onViewChange: (view: NavigationPanelView) => void;
  onNavigate: () => void;
  navigationItems: readonly NavigationPanelLink[];
  themeOptions: readonly NavigationPanelThemeOption[];
  selectedThemeColor?: string;
  onThemeColorChange: (color: string) => void;
  selectedMode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
}

const panelTabs = [
  { id: "navigation", label: "Navigation" },
  { id: "settings", label: "Settings" },
] as const;

function isNavigationPanelView(value: string): value is NavigationPanelView {
  return value === "navigation" || value === "settings";
}

function hasColor(
  option: NavigationPanelThemeOption,
): option is NavigationPanelThemeOption & { color: string } {
  return typeof option.color === "string";
}

export function NavigationPanelContent({
  view,
  onViewChange,
  onNavigate,
  navigationItems,
  themeOptions,
  selectedThemeColor,
  onThemeColorChange,
  selectedMode,
  onModeChange,
  fontScale,
  onFontScaleChange,
}: NavigationPanelContentProps) {
  const resolvedThemeOptions = themeOptions.length > 0 && themeOptions.every(hasColor)
    ? themeOptions
    : null;

  return (
    <Surface
      className="flex max-h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl"
      material="solid"
    >
      <Tabs
        className="min-h-0 gap-0"
        onSelectionChange={(key) => {
          const nextView = String(key);
          if (isNavigationPanelView(nextView)) onViewChange(nextView);
        }}
        selectedKey={view}
        variant="secondary"
      >
        <Tabs.ListContainer className="shrink-0 border-b border-separator p-3">
          <Tabs.List aria-label="Panel section" className="w-full">
            {panelTabs.map(({ id, label }, index) => (
              <Tabs.Tab key={id} className="flex-1" id={id}>
                {index > 0 && <Tabs.Separator />}
                <Tabs.Indicator />
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          className="mt-0 min-h-0 overflow-y-auto overscroll-contain p-0 [scrollbar-gutter:stable]"
          id="navigation"
        >
          <nav aria-label="Primary" className="divide-y divide-separator">
            {navigationItems.map(({ href, label, isExternal }) => (
              <NavigationItem
                key={href}
                href={href}
                isExternal={isExternal}
                label={label}
                onClick={onNavigate}
                rel={isExternal ? "noreferrer" : undefined}
                target={isExternal ? "_blank" : undefined}
              />
            ))}
          </nav>
        </Tabs.Panel>

        <Tabs.Panel
          className="mt-0 min-h-0 overflow-y-auto overscroll-contain p-0 [scrollbar-gutter:stable]"
          id="settings"
        >
          <div className="divide-y divide-separator">
            <SettingsItem label="Theme">
              {resolvedThemeOptions && selectedThemeColor ? (
                <ColorSwatchPicker
                  aria-label="Theme"
                  items={resolvedThemeOptions.map(({ color, label }) => ({
                    color,
                    label,
                  }))}
                  onValueChange={onThemeColorChange}
                  size="xs"
                  value={selectedThemeColor}
                />
              ) : (
                <div aria-hidden="true" className="flex items-center gap-2">
                  {themeOptions.map(({ label }) => (
                    <span
                      key={label}
                      className="size-6 rounded-full bg-default"
                    />
                  ))}
                </div>
              )}
            </SettingsItem>

            <SettingsItem label="Mode">
              <Switch
                aria-label="Dark mode"
                isSelected={selectedMode === "dark"}
                onValueChange={(isDark) =>
                  onModeChange(isDark ? "dark" : "light")
                }
              >
                <span className="sr-only">Dark mode</span>
              </Switch>
            </SettingsItem>

            <SettingsItem label="Font" controlClassName="max-w-48">
              <Slider
                aria-label="Font scale"
                formatOptions={{ style: "percent" }}
                maxValue={1.25}
                minValue={0.75}
                onValueChange={onFontScaleChange}
                step={0.05}
                value={fontScale}
              />
            </SettingsItem>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Surface>
  );
}

"use client";

import { memo, useMemo } from "react";
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

/*
  Deliberately not `Tabs.Indicator`. That is a single shared element React Aria
  moves between tabs by writing an inline `translate`, which `.tabs__indicator`
  transitions — so the selected state slides. Fading it instead would mean
  overriding that internal class, which
  docs/decisions/0002-tabs-indicator-offset.md rules out.

  Giving each tab its own underline keeps to the public API and removes the
  translation entirely: nothing moves, the outgoing mark fades out and the
  incoming one fades in. `.tabs__tab` is already `relative`, so this anchors to
  the tab.
*/
const tabUnderline = (
  <span
    aria-hidden="true"
    className="absolute inset-x-0 bottom-0 h-0.5 bg-accent opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100 motion-reduce:transition-none"
  />
);

function isNavigationPanelView(value: string): value is NavigationPanelView {
  return value === "navigation" || value === "settings";
}

function hasColor(
  option: NavigationPanelThemeOption,
): option is NavigationPanelThemeOption & { color: string } {
  return typeof option.color === "string";
}

const ThemeSetting = memo(function ThemeSetting({
  themeOptions,
  selectedThemeColor,
  onThemeColorChange,
}: Pick<NavigationPanelContentProps,
  "themeOptions" | "selectedThemeColor" | "onThemeColorChange"
>) {
  const themeSwatchItems = useMemo(
    () =>
      themeOptions.length > 0 && themeOptions.every(hasColor)
        ? themeOptions.map(({ color, label }) => ({ color, label }))
        : null,
    [themeOptions],
  );

  const themeSwatchPlaceholders = useMemo(
    () =>
      themeOptions.map(({ label }) => (
        <span key={label} className="size-6 rounded-full bg-default" />
      )),
    [themeOptions],
  );

  return (
    <SettingsItem label="Theme">
      {themeSwatchItems && selectedThemeColor ? (
        <ColorSwatchPicker
          aria-label="Theme"
          items={themeSwatchItems}
          onValueChange={onThemeColorChange}
          size="xs"
          value={selectedThemeColor}
          className="overflow-hidden"
        />
      ) : (
        <div aria-hidden="true" className="flex items-center gap-2">
          {themeSwatchPlaceholders}
        </div>
      )}
    </SettingsItem>
  );
});

const ModeSetting = memo(function ModeSetting({
  selectedMode,
  onModeChange,
}: Pick<NavigationPanelContentProps, "selectedMode" | "onModeChange">) {
  return (
    <SettingsItem label="Mode">
      <Switch
        aria-label="Dark mode"
        isSelected={selectedMode === "dark"}
        onValueChange={(isDark) => onModeChange(isDark ? "dark" : "light")}
      >
        <span className="sr-only">Dark mode</span>
      </Switch>
    </SettingsItem>
  );
});

const FontSetting = memo(function FontSetting({
  fontScale,
  onFontScaleChange,
}: Pick<NavigationPanelContentProps, "fontScale" | "onFontScaleChange">) {
  return (
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
  );
});

/**
 * Memoised because opening and closing the same view changes the surrounding
 * panel's interactivity without changing what the body shows.
 * This only pays off while `NavigationPanel` keeps every prop below stable, so
 * the two have to stay in step.
 */
export const NavigationPanelContent = memo(function NavigationPanelContent({
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

  const navigationLinks = useMemo(
    () =>
      navigationItems.map(({ href, label, isExternal }) => (
        <NavigationItem
          key={href}
          href={href}
          isExternal={isExternal}
          label={label}
          onClick={onNavigate}
          rel={isExternal ? "noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
        />
      )),
    [navigationItems, onNavigate],
  );

  /**
   * The card's height is left to its content. The panel is hinged at its bottom
   * edge by the wrapper in NavigationPanel, so a height change moves only the
   * top edge — no animation is applied on tab change, and the resize is
   * instant by design.
   *
   * Keep both tab bodies mounted to avoid initializing their controls during
   * opening; hide the inactive body so only the selected one contributes to the
   * card's intrinsic height.
   */
  return (
    <Surface
      className="flex max-h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl inset-ring inset-ring-border"
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
            <Tabs.Tab className="group flex-1" id="navigation">
              {tabUnderline}
              Navigation
            </Tabs.Tab>

            <Tabs.Tab className="group flex-1" id="settings">
              <Tabs.Separator />
              {tabUnderline}
              Settings
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          className="mt-0 min-h-0 overflow-y-auto p-0"
          hidden={view !== "navigation"}
          id="navigation"
          shouldForceMount
        >
          <nav aria-label="Primary" className="divide-y divide-separator">
            {navigationLinks}
          </nav>
        </Tabs.Panel>

        <Tabs.Panel
          className="mt-0 min-h-0 overflow-y-auto p-0"
          hidden={view !== "settings"}
          id="settings"
          shouldForceMount
        >
          <div className="divide-y divide-separator">
            <ThemeSetting
              themeOptions={themeOptions}
              selectedThemeColor={selectedThemeColor}
              onThemeColorChange={onThemeColorChange}
            />
            <ModeSetting
              selectedMode={selectedMode}
              onModeChange={onModeChange}
            />
            <FontSetting
              fontScale={fontScale}
              onFontScaleChange={onFontScaleChange}
            />
          </div>
        </Tabs.Panel>
      </Tabs>
    </Surface>
  );
});

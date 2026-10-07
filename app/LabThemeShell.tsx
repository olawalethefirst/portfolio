"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { NavigationPanel, type ThemeMode } from "@/src/components/ui/navigation-panel";

import { themeForAccent, themes, useThemeAccents } from "./theme-accents";
import type { ThemeName } from "./theme-accents";

const navigationItems = [
  { href: "/", label: "Component lab" },
  { href: "/project-item-lab", label: "Project item lab" },
  { href: "/publication-details-lab", label: "Publication details lab" },
] as const;

function formatThemeLabel(theme: ThemeName) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export interface LabThemeShellProps {
  children: ReactNode | ((navigation: ReactNode) => ReactNode);
  initialTheme?: ThemeName;
  initialMode?: ThemeMode;
}

export function LabThemeShell({
  children,
  initialTheme = "chartreuse",
  initialMode = "light",
}: LabThemeShellProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(initialTheme);
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(initialMode);
  const [fontScale, setFontScale] = useState(1);
  const accents = useThemeAccents();

  useEffect(() => {
    const previousFontSize = document.documentElement.style.fontSize;

    document.documentElement.style.fontSize = `${fontScale * 100}%`;

    return () => {
      document.documentElement.style.fontSize = previousFontSize;
    };
  }, [fontScale]);

  const hasCustomNavigationPlacement = typeof children === "function";

  const navigation = (
    <NavigationPanel
      fontScale={fontScale}
      navigationItems={navigationItems}
      onFontScaleChange={setFontScale}
      onModeChange={setSelectedMode}
      onThemeColorChange={(color) => {
        if (!accents) return;

        const theme = themeForAccent(accents, color);

        if (theme) setSelectedTheme(theme);
      }}
      selectedMode={selectedMode}
      selectedThemeColor={accents?.[selectedTheme]}
      themeOptions={themes.map((theme) => ({
        color: accents?.[theme],
        label: formatThemeLabel(theme),
      }))}
    />
  );

  return (
    <div
      className={`${selectedMode} min-h-screen bg-background font-sans text-foreground`}
      data-theme={selectedTheme}
      data-mode={selectedMode}
    >
      {hasCustomNavigationPlacement ? (
        children(navigation)
      ) : (
        <>
          {children}
          <div className="pointer-events-none fixed inset-x-0 bottom-2 z-20">
            {navigation}
          </div>
        </>
      )}
    </div>
  );
}

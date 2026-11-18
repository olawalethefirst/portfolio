"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { NavigationPanel } from "@/src/components/ui/navigation-panel";

import { themeForAccent, themes, useThemeAccents } from "./theme-accents";
import type { ThemeName } from "@/src/theme/theme";
import { useActiveTheme, useAppearance } from "@/src/theme/AppearanceProvider";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
] as const;

function formatThemeLabel(theme: ThemeName) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export interface LabThemeShellProps {
  children: ReactNode | ((navigation: ReactNode) => ReactNode);
}

export function LabThemeShell({ children }: LabThemeShellProps) {
  const { theme: selectedTheme, mode: selectedMode } = useActiveTheme();
  const setMode = useAppearance((state) => state.setMode);
  const setTheme = useAppearance((state) => state.setTheme);
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
      onModeChange={setMode}
      onThemeColorChange={(color) => {
        if (!accents) return;

        const theme = themeForAccent(accents, color);

        if (theme) setTheme(theme);
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
    <div className="min-h-screen bg-background font-sans text-foreground">
      {hasCustomNavigationPlacement ? (
        children(navigation)
      ) : (
        <>
          {children}
          <div className="pointer-events-none fixed inset-x-0 bottom-[var(--navigation-bottom-offset)] z-20">
            {navigation}
          </div>
        </>
      )}
    </div>
  );
}

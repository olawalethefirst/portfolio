"use client";

import { Menu, Settings2 } from "lucide-react";
import type { Ref } from "react";

import { Button } from "../Button";
import { BrandMark } from "../BrandMark";
import { Surface } from "../Surface";
import { cn } from "../utils";

export interface NavPillProps {
  onMenuPress?: () => void;
  onSettingsPress?: () => void;
  menuLabel?: string;
  settingsLabel?: string;
  menuButtonRef?: Ref<HTMLButtonElement>;
  settingsButtonRef?: Ref<HTMLButtonElement>;
  panelId?: string;
  isExpanded?: boolean;
  className?: string;
}

/**
 * The `outline` variant borders with `--border`, which is tuned for dividers and
 * nearly disappears against the pill's own glass. `--muted` is the theme's
 * mid-tone in both light and dark modes, so it keeps each control legible as a
 * discrete target without reading as heavy as `--foreground`.
 */
const iconButtonClassName = "border-muted/50";

export function NavPill({
  onMenuPress,
  onSettingsPress,
  menuLabel = "Menu",
  settingsLabel = "Settings",
  menuButtonRef,
  settingsButtonRef,
  panelId,
  isExpanded = false,
  className,
}: NavPillProps) {
  return (
    <Surface
      className={cn("flex min-h-[var(--navigation-pill-height)] items-center gap-2 rounded-full p-2", className)}
      material="glass"
    >
      <Button
        ref={menuButtonRef}
        aria-controls={panelId}
        aria-expanded={panelId ? isExpanded : undefined}
        aria-haspopup={panelId ? "dialog" : undefined}
        aria-label={menuLabel}
        className={iconButtonClassName}
        isIconOnly
        onPress={onMenuPress}
        size="sm"
        variant="outline"
      >
        <Menu aria-hidden="true" />
      </Button>
      <BrandMark />
      <Button
        ref={settingsButtonRef}
        aria-controls={panelId}
        aria-expanded={panelId ? isExpanded : undefined}
        aria-haspopup={panelId ? "dialog" : undefined}
        aria-label={settingsLabel}
        className={iconButtonClassName}
        isIconOnly
        onPress={onSettingsPress}
        size="sm"
        variant="outline"
      >
        <Settings2 aria-hidden="true" />
      </Button>
    </Surface>
  );
}

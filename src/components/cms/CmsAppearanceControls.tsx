"use client";

import { Popover } from "@heroui/react/popover";
import { ColorSwatchPicker } from "@/src/components/ui/ColorSwatchPicker";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { setGlobalMode, setGlobalTheme, useActiveTheme } from "@/src/theme/active-theme";
import { themes, type ThemeName } from "@/src/theme/theme";
import { themeForAccent, useThemeAccents } from "@/src/theme/theme-accents";

const toneLabel = (tone: ThemeName) => tone[0].toUpperCase() + tone.slice(1);

function TonePicker({ theme, onSelect }: { theme: ThemeName; onSelect: (tone: ThemeName) => void }) {
  const accents = useThemeAccents();
  if (!accents) return null;
  return <ColorSwatchPicker aria-label="Tone" size="sm"
    items={themes.map((tone) => ({ color: accents[tone], label: toneLabel(tone) }))}
    value={accents[theme]} className="flex flex-row gap-1 overflow-visible"
    onValueChange={(color) => {
      const tone = themeForAccent(accents, color);
      if (tone) onSelect(tone);
    }} />;
}

export function CmsAppearanceControls() {
  const { theme, mode } = useActiveTheme();
  const [open, setOpen] = useState(false);
  return <div className="flex items-center gap-1">
    <Button variant="ghost" isIconOnly aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      onPress={() => setGlobalMode(mode === "dark" ? "light" : "dark")}>
      {mode === "dark" ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
    </Button>
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button variant="ghost" isIconOnly aria-label={`Choose tone, current: ${toneLabel(theme)}`}>
        <span aria-hidden="true" className="size-5 rounded-full border border-foreground/30 bg-accent" />
      </Button>
      <Popover.Content placement="bottom end" className="w-fit min-w-0 rounded-lg">
        <Popover.Dialog aria-label="Tone" className="p-1">
          {open ? <TonePicker theme={theme} onSelect={(tone) => {
            setGlobalTheme(tone);
            setOpen(false);
          }} /> : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  </div>;
}

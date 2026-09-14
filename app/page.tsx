"use client";

import { Button } from "@/src/components/ui/Button";
import { Chip } from "@/src/components/ui/Chip";
import { ColorSwatch } from "@/src/components/ui/ColorSwatch";
import { Progress } from "@/src/components/ui/Progress";
import { SegmentControl } from "@/src/components/ui/SegmentControl";
import { Surface } from "@/src/components/ui/Surface";
import { ListBox } from "@heroui/react/list-box";
import { Select } from "@heroui/react/select";
import { Switch } from "@heroui/react/switch";
import { useState } from "react";

const themes = ["chartreuse", "copper", "plum", "forest"] as const;
type ThemeName = (typeof themes)[number];
type ThemeMode = "light" | "dark";

const buttonVariants = [
  "primary",
  "secondary",
  "tertiary",
  "outline",
  "ghost",
  "danger",
  "danger-soft",
] as const;

function formatOptionLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const sections = [
  { id: "buttons", label: "Buttons" },
  { id: "segment-control", label: "Segment Control" },
  { id: "chips", label: "Chips" },
  { id: "progress", label: "Progress" },
  { id: "color-swatches", label: "Color Swatches" },
  { id: "surface", label: "Surface" },
];

const chipColors = ["default", "accent", "success", "warning", "danger"] as const;

export default function Home() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("chartreuse");
  const [selectedMode, setSelectedMode] = useState<ThemeMode>("light");

  return (
    <main
      className={`${selectedMode} min-h-screen bg-background px-5 py-8 text-foreground sm:px-8`}
      data-mode={selectedMode}
      data-theme={selectedTheme}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted">HeroUI design system</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Shared token themes
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Four palettes mapped directly into HeroUI runtime color variables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Select
              aria-label="Theme"
              onChange={(key) => key != null && setSelectedTheme(String(key) as ThemeName)}
              value={selectedTheme}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {themes.map((theme) => (
                    <ListBox.Item key={theme} id={theme}>
                      {formatOptionLabel(theme)}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Switch
              isSelected={selectedMode === "dark"}
              onChange={(isDark) => setSelectedMode(isDark ? "dark" : "light")}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Dark mode
              </Switch.Content>
            </Switch>
          </div>

          <nav aria-label="Sections" className="flex flex-wrap gap-4 text-sm text-muted">
            {sections.map((section) => (
              <a
                key={section.id}
                className="hover:text-foreground"
                href={`#${section.id}`}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </header>

        <section id="buttons" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Buttons</h2>
            <p className="text-sm text-muted">
              Default HeroUI styling fed by the active shared token set.
            </p>
          </div>
          <Surface className="flex flex-wrap gap-3 rounded-xl border border-border p-4">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </Surface>
        </section>

        <section id="segment-control" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Segment Control</h2>
            <p className="text-sm text-muted">
              Compact tab navigation with disabled-item support.
            </p>
          </div>
          <Surface className="rounded-xl border border-border p-4">
            <SegmentControl
              defaultValue="overview"
              items={[
                { value: "overview", label: "Overview" },
                { value: "work", label: "Work" },
                { value: "notes", label: "Notes" },
                { value: "disabled", label: "Disabled", isDisabled: true },
              ]}
            />
          </Surface>
        </section>

        <section id="chips" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Chips</h2>
            <p className="text-sm text-muted">
              Compact status and tag labels across colors and variants.
            </p>
          </div>
          <Surface className="flex flex-wrap gap-3 rounded-xl border border-border p-4">
            {chipColors.map((color) => (
              <Chip key={color} color={color}>
                {formatOptionLabel(color)}
              </Chip>
            ))}
          </Surface>
          <Surface className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
            <Chip variant="primary">Primary</Chip>
            <Chip variant="secondary">Secondary</Chip>
            <Chip variant="soft">Soft</Chip>
            <Chip variant="tertiary">Tertiary</Chip>
            <Chip size="sm">Small</Chip>
            <Chip size="lg">Large</Chip>
          </Surface>
        </section>

        <section id="progress" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Progress</h2>
            <p className="text-sm text-muted">
              Determinate and indeterminate states with color support.
            </p>
          </div>
          <Surface className="flex flex-col gap-4 rounded-xl border border-border p-4">
            <Progress label="Accent progress" size="xs" value={72} />
            <Progress isIndeterminate label="Indeterminate danger" color="danger" />
          </Surface>
        </section>

        <section id="color-swatches" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Color Swatches</h2>
            <p className="text-sm text-muted">
              Token-referenced and literal color samples.
            </p>
          </div>
          <Surface className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
            <ColorSwatch color="var(--accent)" colorName="Accent" isSelected />
            <ColorSwatch color="var(--accent-soft)" colorName="Accent soft" />
            <ColorSwatch color="var(--surface)" colorName="Surface" shape="square" />
            <ColorSwatch color="var(--foreground)" colorName="Foreground" shape="square" />
            <ColorSwatch color="#a1a1aa" colorName="Disabled" isDisabled />
          </Surface>
        </section>

        <section id="surface" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Surface</h2>
            <p className="text-sm text-muted">Layout panels in three variants.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Surface className="rounded-lg border border-border p-4" variant="primary">
              Primary surface
            </Surface>
            <Surface className="rounded-lg border border-border p-4" variant="secondary">
              Secondary surface
            </Surface>
            <Surface className="rounded-lg border border-border p-4" variant="elevated">
              Elevated surface
            </Surface>
          </div>
        </section>
      </div>
    </main>
  );
}

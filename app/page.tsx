"use client";

import { Button } from "@/src/components/ui/Button";
import { Chip } from "@/src/components/ui/Chip";
import { ColorSwatchPicker } from "@/src/components/ui/ColorSwatchPicker";
import { Progress } from "@/src/components/ui/Progress";
import { Slider } from "@/src/components/ui/Slider";
import { Surface } from "@/src/components/ui/Surface";
import { Switch } from "@/src/components/ui/Switch";
import { Tabs } from "@/src/components/ui/Tabs";
import { NavigationPanel } from "@/src/components/ui/navigation-panel";
import { HeroControlPanelPreview } from "@/src/components/ui/hero-control-panel";
import type { ThemeMode } from "@/src/components/ui/navigation-panel";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { themeForAccent, themes, useThemeAccents } from "./theme-accents";
import type { ThemeName } from "./theme-accents";

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
  { id: "tabs", label: "Tabs" },
  { id: "chips", label: "Chips" },
  { id: "progress", label: "Progress" },
  { id: "slider", label: "Slider" },
  { id: "surface", label: "Surface" },
  { id: "glass-material", label: "Glass Material" },
  { id: "hero-control-panel", label: "Hero Control Panel" },
];

const navigationPanelItems = [
  { href: "#buttons", label: "Buttons" },
  { href: "#tabs", label: "Tabs" },
  { href: "#chips", label: "Chips" },
  { href: "#progress", label: "Progress" },
  { href: "https://lucide.dev", label: "Lucide", isExternal: true },
];

const chipColors = ["default", "accent", "success", "warning", "danger"] as const;

function ShowcaseShell({
  children,
  isGlass,
}: {
  children: ReactNode;
  isGlass: boolean;
}) {
  const className =
    "relative z-10 min-h-screen px-5 pt-8 pb-32 sm:px-8";

  if (isGlass) {
    return (
      <Surface
        className={`${className} fixed inset-0 overflow-y-auto`}
        material="glass"
      >
        {children}
      </Surface>
    );
  }

  return <div className={className}>{children}</div>;
}

export default function Home() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("chartreuse");
  const [selectedMode, setSelectedMode] = useState<ThemeMode>("light");
  const [isViewportGlass, setIsViewportGlass] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  // Null until a document exists, so the first render shows a placeholder of
  // matching dimensions rather than swatches with no colour.
  const accents = useThemeAccents();

  useEffect(() => {
    const previousFontSize = document.documentElement.style.fontSize;

    document.documentElement.style.fontSize = `${fontScale * 100}%`;

    return () => {
      document.documentElement.style.fontSize = previousFontSize;
    };
  }, [fontScale]);

  return (
    <main
      className={`${selectedMode} relative min-h-screen overflow-hidden bg-background text-foreground`}
      data-mode={selectedMode}
      data-theme={selectedTheme}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-16 size-72 rounded-full bg-accent opacity-40" />
        <div className="absolute right-[8%] top-[28%] size-56 rotate-12 rounded-[30%] bg-warning opacity-35" />
        <div className="absolute -bottom-24 left-[36%] size-80 rounded-full bg-success opacity-30" />
      </div>

      <ShowcaseShell isGlass={isViewportGlass}>
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
            {accents ? (
              <ColorSwatchPicker
                aria-label="Theme"
                items={themes.map((theme) => ({
                  color: accents[theme],
                  label: formatOptionLabel(theme),
                }))}
                onValueChange={(hex) => {
                  const theme = themeForAccent(accents, hex);

                  if (theme) setSelectedTheme(theme);
                }}
                value={accents[selectedTheme]}
              />
            ) : (
              <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
                {themes.map((theme) => (
                  <span key={theme} className="size-8 rounded-2xl bg-default" />
                ))}
              </div>
            )}

            <Switch
              isSelected={selectedMode === "dark"}
              onValueChange={(isDark) =>
                setSelectedMode(isDark ? "dark" : "light")
              }
            >
              Dark mode
            </Switch>

            <Switch
              isSelected={isViewportGlass}
              onValueChange={setIsViewportGlass}
            >
              Full viewport glass
            </Switch>

          </div>

          <p aria-live="polite" className="text-xs text-muted">
            {isViewportGlass
              ? "One full-viewport filter owns the backdrop; descendant glass surfaces keep only their chrome."
              : "Bounded glass surfaces own their backdrop filters independently."}
          </p>

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

        <section id="tabs" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Tabs</h2>
            <p className="text-sm text-muted">
              Compact tab navigation with matching content panels.
            </p>
          </div>
          <Surface className="rounded-xl border border-border p-4">
            <Tabs defaultSelectedKey="overview">
              <Tabs.ListContainer>
                <Tabs.List aria-label="Portfolio sections">
                  <Tabs.Tab id="overview">
                    <Tabs.Indicator />
                    Overview
                  </Tabs.Tab>
                  <Tabs.Tab id="work">
                    <Tabs.Separator />
                    <Tabs.Indicator />
                    Work
                  </Tabs.Tab>
                  <Tabs.Tab id="notes">
                    <Tabs.Separator />
                    <Tabs.Indicator />
                    Notes
                  </Tabs.Tab>
                  <Tabs.Tab id="disabled" isDisabled>
                    <Tabs.Separator />
                    <Tabs.Indicator />
                    Disabled
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
              <Tabs.Panel id="overview">Overview panel content.</Tabs.Panel>
              <Tabs.Panel id="work">Work panel content.</Tabs.Panel>
              <Tabs.Panel id="notes">Notes panel content.</Tabs.Panel>
              <Tabs.Panel id="disabled">Disabled panel content.</Tabs.Panel>
            </Tabs>
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

        <section id="slider" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Slider</h2>
            <p className="text-sm text-muted">
              Numeric input from 0.5 to 1.5 with its value beside the track.
            </p>
          </div>
          <Surface className="rounded-xl border border-border p-4">
            <Slider
              aria-label="Scale"
              defaultValue={1}
              minValue={0.5}
              maxValue={1.5}
              step={0.1}
            />
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

        <section id="glass-material" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Glass Material</h2>
            <p className="text-sm text-muted">
              Opt-in Surface material with one filter owner per glass hierarchy.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="absolute -left-8 top-8 size-32 rounded-full bg-accent opacity-60"
            />
            <div
              aria-hidden="true"
              className="absolute -right-8 bottom-4 size-40 rotate-12 rounded-[28%] bg-warning opacity-50"
            />

            <div className="relative grid gap-6 md:grid-cols-2">
              <Surface
                className="min-h-48 rounded-2xl p-6"
                material="glass"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Bounded owner
                </p>
                <h3 className="mt-3 text-xl font-semibold">Reusable glass surface</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  The active theme surface token supplies the tint and ring while
                  the shared material owns blur, saturation, and shadow.
                </p>
              </Surface>

              <Surface
                className="flex min-h-48 flex-col gap-4 rounded-2xl p-6"
                material="glass"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Nested hierarchy
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">One backdrop filter</h3>
                </div>
                <Surface
                  className="mt-auto rounded-xl p-4"
                  material="glass"
                  variant="secondary"
                >
                  <p className="text-sm font-medium">Chrome remains visible</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    This child keeps tint, ring, and shadow, but its nested filter
                    is suppressed.
                  </p>
                </Surface>
              </Surface>
            </div>
          </div>
        </section>

        <section id="hero-control-panel" className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Hero Control Panel</h2>
            <p className="text-sm text-muted">
              Fully controlled hero navigation with manual triggers for every state.
            </p>
          </div>
          <HeroControlPanelPreview />
        </section>
        </div>
      </ShowcaseShell>

      <NavigationPanel
        fontScale={fontScale}
        navigationItems={navigationPanelItems}
        onFontScaleChange={setFontScale}
        onModeChange={setSelectedMode}
        onThemeColorChange={(hex) => {
          if (!accents) return;

          const theme = themeForAccent(accents, hex);

          if (theme) setSelectedTheme(theme);
        }}
        selectedMode={selectedMode}
        selectedThemeColor={accents?.[selectedTheme]}
        themeOptions={themes.map((theme) => ({
          color: accents?.[theme],
          label: formatOptionLabel(theme),
        }))}
      />
    </main>
  );
}

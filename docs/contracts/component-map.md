# Component Map

Local UI primitives live in `src/components/ui/` and wrap HeroUI v3 primitives from `@heroui/react`. Claude Design should import these local wrappers instead of importing HeroUI directly.

## Button

File: `src/components/ui/Button.tsx`

```ts
type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isIconOnly?: boolean;
  className?: string;
  children?: React.ReactNode;
}
```

Maps to HeroUI `Button`. Local `isLoading` is rendered as a visible spinner and mapped to the native pending state.

`isIconOnly` passes straight through to HeroUI. Pass the icon as `children` rather
than through `startContent`, and always supply an `aria-label`, because an
icon-only button has no text to name it. HeroUI renders icon-only buttons as
squares of 36, 40, or 44 pixels for `sm`, `md`, and `lg`, each narrowing by four
pixels at the `md` breakpoint, so `size="lg"` meets the 44 pixel touch target on
touch-sized viewports. The button radius is larger than half the side at every
one of those sizes, so the browser clamps it and an icon-only button renders as a
true circle without any extra styling. Icons inside a button are sized
automatically.

## Tabs

File: `src/components/ui/Tabs.tsx`

Re-exports HeroUI v3's compound `Tabs` API and its public prop types through the
local design-system boundary. Use HeroUI's native selection props:
`selectedKey`, `defaultSelectedKey`, and `onSelectionChange`.

```tsx
<Tabs defaultSelectedKey="overview">
  <Tabs.ListContainer>
    <Tabs.List aria-label="Sections">
      <Tabs.Tab id="overview">
        <Tabs.Indicator />
        Overview
      </Tabs.Tab>
      <Tabs.Tab id="settings">
        <Tabs.Separator />
        <Tabs.Indicator />
        Settings
      </Tabs.Tab>
    </Tabs.List>
  </Tabs.ListContainer>
  <Tabs.Panel id="overview">Overview content</Tabs.Panel>
  <Tabs.Panel id="settings">Settings content</Tabs.Panel>
</Tabs>
```

Every content tab must have a `Tabs.Panel` whose `id` matches the tab's `id`.
Panels may be omitted only for link navigation or when the tab controls content
in another explicitly associated region. There is no local `renderPanel` API.

### More than one on a page

HeroUI's selection indicator mispositions itself on every `Tabs` instance after
the first on a page, offsetting it vertically by a cumulative 16 pixels per
preceding instance until the user changes tabs. The defect is upstream and
reproduces with raw HeroUI `Tabs`, so it is handled by convention rather than in
this wrapper.

Give every uncontrolled `Tabs` instance after the first on a page a
`defaultSelectedKey` that matches no tab id. The documented sentinel is the
string `"null"`:

```tsx
<Tabs defaultSelectedKey="overview">...</Tabs>
<Tabs defaultSelectedKey={TABS_NO_DEFAULT}>...</Tabs>
<Tabs defaultSelectedKey={TABS_NO_DEFAULT}>...</Tabs>
```

A default that matches nothing sidesteps the offset, and React Aria falls back to
selecting the first tab, so the control still renders with a tab selected and its
indicator correctly placed. From the user's first selection onward it behaves
identically to any other Tabs instance.

Two consequences to design for. The fallback is internal to the tab state, so
`onSelectionChange` does not fire for it and a consumer tracking the selection
separately holds no value until the user picks one; controls needing their
selection known at load should be controlled through `selectedKey` instead. And
the sentinel must not collide with a real tab id, which is why a
reserved-looking string is preferred over an empty one. The exported
`TABS_NO_DEFAULT` constant carries it. See
`docs/decisions/0002-tabs-indicator-offset.md`.

## Progress

File: `src/components/ui/Progress.tsx`

```ts
type ProgressSize = "xs" | "sm" | "md" | "lg";
type ProgressColor = "accent" | "default" | "success" | "warning" | "danger";

interface ProgressProps {
  value?: number;
  minValue?: number;
  maxValue?: number;
  label?: string;
  isIndeterminate?: boolean;
  size?: ProgressSize;
  color?: ProgressColor;
  className?: string;
}
```

Maps to HeroUI `ProgressBar`. Values are clamped to the supplied `minValue` and `maxValue`; use `isIndeterminate` when progress has no fixed value. The `xs` size maps to HeroUI `sm` behavior with a thinner visual track.

## Slider

File: `src/components/ui/Slider.tsx`

```ts
interface SliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueChangeEnd?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  isDisabled?: boolean;
  className?: string;
}
```

Maps to the compound HeroUI `Slider`. The wrapper is horizontal and
single-value only: range arrays, vertical orientation, marks, and custom
compound children are intentionally excluded.

The visible rail and fill are two pixels high, matching `Progress size="xs"`,
but they sit inside HeroUI's 20-pixel track so the pointer target does not shrink
with the visual treatment. The current value is always rendered directly to the
right of the track through `Slider.Output`; `formatOptions` controls that output
using HeroUI's locale-aware number formatter.

Consumers must provide an accessible name with `aria-label` or
`aria-labelledby`. Value-change callbacks are renamed to match the local
`ColorSwatchPicker` convention.

## Chip

File: `src/components/ui/Chip.tsx`

```ts
type ChipColor = "accent" | "default" | "success" | "warning" | "danger";
type ChipVariant = "primary" | "secondary" | "soft" | "tertiary";
type ChipSize = "sm" | "md" | "lg";

interface ChipProps {
  children: React.ReactNode;
  color?: ChipColor;
  variant?: ChipVariant;
  size?: ChipSize;
  className?: string;
}
```

Maps to HeroUI `Chip`. Prop names and values pass straight through to the HeroUI primitive with no renaming.

## ColorSwatchPicker

File: `src/components/ui/ColorSwatchPicker.tsx`

```ts
type ColorSwatchPickerSize = "xs" | "sm" | "md" | "lg" | "xl";
type ColorSwatchPickerShape = "circle" | "square";
type ColorSwatchPickerLayout = "grid" | "stack";

interface ColorSwatchPickerItem {
  color: string;
  label: string;
  isDisabled?: boolean;
}

interface ColorSwatchPickerProps {
  items: ColorSwatchPickerItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: ColorSwatchPickerSize;
  shape?: ColorSwatchPickerShape;
  layout?: ColorSwatchPickerLayout;
  className?: string;
}
```

Maps to HeroUI `ColorSwatchPicker`. Replaces the former display-only
`ColorSwatch`, which rendered `role="img"` and whose `isSelected` was decorative.

`item.color` must be a color React Aria can parse: hex, `rgb()`, or `hsl()`. It
cannot be `oklch()` or a `var(--token)` reference. React Aria's color model
covers only hex, rgb, hsl, and hsb, and anything else throws `Invalid color
value` at render. Design tokens are authored in `oklch()`, so a consumer wanting
a token color must convert it first rather than passing the variable through;
`app/theme-accents.ts` shows that pattern for the showcase themes.

Passing a real color rather than a placeholder styled by CSS is required, not
merely preferred, because HeroUI derives the selected checkmark's light-or-dark
treatment from the parsed color's luminance.

`item.label` is required and supplies both the accessible name, via the swatch's
`colorName`, and the tooltip shown on hover and keyboard focus. Without it React
Aria generates a description such as "dark vibrant lime", which is wrong for a
swatch that stands for something rather than for a color.

Divergences from the HeroUI primitive:

- `shape` maps to HeroUI's `variant`, renamed because `variant` already means
  visual style on `Button` and `Tabs`.
- `onValueChange` receives a hex string rather than a React Aria `Color`,
  matching the local value-callback convention and keeping React Aria types out
  of consumer code.
- Items are a flat `items` array rather than compound children so each parsed
  color stays paired with its accessible label.
- The tooltip is a CSS-driven element rather than the HeroUI `Tooltip`, because
  `Tooltip.Trigger` renders a focusable `role="button"` wrapper that is invalid
  inside a listbox option. See the component source for the full reasoning.

## Surface

File: `src/components/ui/Surface.tsx`

```ts
type SurfaceVariant = "primary" | "secondary" | "elevated";
type SurfaceMaterial = "solid" | "glass";

interface SurfaceProps {
  variant?: SurfaceVariant;
  material?: SurfaceMaterial;
  className?: string;
  children: React.ReactNode;
}
```

Maps to HeroUI `Surface` for layout panels and cards. `material` defaults to
`solid`, preserving the selected surface variant. The opt-in `glass` material
uses HeroUI's transparent variant so solid component backgrounds cannot obscure
the shared glass presentation.

Glass tint and ring colors derive from the active theme's semantic `--surface`
token, which represents the light or dark endpoint already present in each theme.
The shared material owns the fixed blur, saturation, ring, and shadow values.

Only `Surface` is currently allowed to opt into glass. Within a glass hierarchy,
the outermost glass surface owns the backdrop filter. Descendant glass surfaces
retain their tint, ring, and shadow but suppress their backdrop filter. This rule
also permits a full-viewport glass surface without multiplying filters through
its component tree. Keep the content behind a full-viewport owner static where
possible, scroll inside the owner, and do not animate its blur or dimensions.

Browsers without backdrop-filter support, and users requesting reduced
transparency, receive an opaque `--surface` fallback.

## Switch

File: `src/components/ui/Switch.tsx`

```ts
interface SwitchProps {
  children: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  onValueChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  className?: string;
}
```

Maps to HeroUI `Switch` with an owned `Content` / `Control` / `Thumb`
composition. Consumers pass the visible label directly as `children` and use
`onValueChange` for selection changes, matching the other local input wrappers.

The standard control keeps HeroUI's 40px width and default 22px × 16px pill
thumb, with a locally thinned 10px track. The component intentionally does not
expose HeroUI's size variants or alternate compound children. State, disabled
behavior, focus, form integration, and ARIA semantics remain delegated to
HeroUI and React Aria.

## NavigationItem

File: `src/components/ui/navigation-panel/NavigationItem.tsx`

```ts
interface NavigationItemProps {
  label: React.ReactNode;
  href: string;
  isExternal?: boolean;
  className?: string;
}
```

A flat, full-width navigation row with its label on the left and an internal
icon on the right. `isExternal` defaults to `false`: internal destinations show
Lucide `ArrowRight`, while explicitly external destinations show Lucide
`ArrowUpRight`. The distinction is explicit rather than inferred from `href`,
because an absolute URL can still belong to the current application.

The entire row is one native link and owns its hover, pressed, and focus-visible
treatment. It has no radius or outer border; render multiple items inside one
rounded, overflow-clipped container and use separators between them. Standard
anchor props such as `target`, `rel`, and `onClick` pass through unchanged.

## SettingsItem

File: `src/components/ui/navigation-panel/SettingsItem.tsx`

```ts
interface SettingsItemProps {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  controlClassName?: string;
}
```

A non-interactive flat row sharing `NavigationItem`'s height, padding, label
typography, and trailing alignment. The label appears on the left and `children`
provides one trailing control, such as `Slider`, `Switch`, or
`ColorSwatchPicker`, on the right.

The row and visible label deliberately do not activate or focus the control.
The trailing control must therefore provide its own accessible name. Use an
`aria-label` on `Slider` and `ColorSwatchPicker`; a compact `Switch` can receive
an `aria-label` and visually hidden children. Like `NavigationItem`, this
component has no radius or border because the shared container owns both.

## NavPill

File: `src/components/ui/navigation-panel/NavPill.tsx`

```ts
interface NavPillProps {
  onMenuPress?: () => void;
  onSettingsPress?: () => void;
  menuLabel?: string;
  settingsLabel?: string;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
  settingsButtonRef?: React.Ref<HTMLButtonElement>;
  panelId?: string;
  isExpanded?: boolean;
  className?: string;
}
```

A floating navigation pill: a glass `Surface` with a full border radius wrapping
two icon-only `Button`s in a horizontal row, a menu control on the left and a
settings control on the right. It adds no layout or material CSS of its own; the
shape, size, and glass presentation all come from the components it composes.

Both controls use the `outline` button variant at the `lg` size, which is a 44
pixel square on touch-sized viewports. Their transparent fill lets the glass
behind them show through. The variant's default border uses `--border`, which is
tuned for dividers and nearly disappears against glass, so the component
strengthens it to `--muted` at half opacity — the theme's mid-tone in both light
and dark modes. That keeps each control legible as a discrete target without
reading as heavily as `--foreground` would.

The icons are internal implementation detail and are not configurable. Their
accessible names are, through `menuLabel` and `settingsLabel`, so the names are
not hardcoded English. Both press handlers are optional, which lets the component
render inert in a showcase.

The optional button refs support focus restoration when the pill launches an
overlay. When `panelId` is present, both controls expose `aria-controls` and
`aria-haspopup="dialog"` for that panel. `isExpanded` defaults to `false` and,
when `panelId` is present, supplies the matching `aria-expanded` value to both
launchers. The consumer still owns expanded state, dismissal, and focus
movement.

`NavPill` does not position itself. Fixed or absolute placement is page-level
layout glue supplied by the consumer through `className`, so the same component
can be used anywhere rather than only as a viewport-fixed element.

Placement interacts with the glass material and is worth stating explicitly.
Within a glass hierarchy only the outermost glass surface owns the backdrop
filter, and a nested glass surface keeps its tint, ring, and shadow while its own
filter is suppressed. That tint is only a few percent opaque, which is fine over
a static backdrop but not behind a fixed element that page content scrolls under:
the text would remain sharp and legible straight through the pill. Render
`NavPill` outside any full-viewport glass surface so that it owns its own
backdrop filter, and give it something with contrast to refract.

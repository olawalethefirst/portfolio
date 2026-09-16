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
  className?: string;
  children?: React.ReactNode;
}
```

Maps to HeroUI `Button`. Local `isLoading` is rendered as a visible spinner and mapped to the native pending state.

## SegmentControl

File: `src/components/ui/SegmentControl.tsx`

```ts
type SegmentControlVariant = "primary" | "secondary";

interface SegmentControlItem {
  value: string;
  label: React.ReactNode;
  isDisabled?: boolean;
  href?: string;
}

interface SegmentControlProps {
  items: SegmentControlItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: SegmentControlVariant;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
}
```

Maps only the compact HeroUI tabs navigation track using `Tabs.ListContainer`, `Tabs.List`, `Tabs.Tab`, `Tabs.Indicator`, and `Tabs.Separator`. It intentionally does not render `Tabs.Panel` or any tab body content.

### More than one on a page

HeroUI's selection indicator mispositions itself on every `Tabs` instance after
the first on a page, offsetting it vertically by a cumulative 16 pixels per
preceding instance until the user changes tabs. The defect is upstream and
reproduces with raw HeroUI `Tabs`, so it is handled by convention rather than in
this wrapper.

Give every `SegmentControl` after the first on a page a `defaultValue` that
matches none of its `items`. The documented sentinel is the string `"null"`:

```tsx
<SegmentControl defaultValue="overview" items={items} />
<SegmentControl defaultValue="null" items={items} />
<SegmentControl defaultValue="null" items={items} />
```

A default that matches nothing sidesteps the offset, and React Aria falls back to
selecting the first tab, so the control still renders with a segment selected and
its indicator correctly placed. From the user's first selection onward it behaves
identically to any other control.

Two consequences to design for. The fallback is internal to the tab state, so
`onValueChange` does not fire for it and a consumer tracking the selection
separately holds no value until the user picks one; controls needing their
selection known at load should be controlled through `value` instead. And the
sentinel must not collide with a real item value, which is why a
reserved-looking string is preferred over an empty one. The exported
`SEGMENT_CONTROL_NO_DEFAULT` constant carries it. See
`docs/decisions/0002-segment-control-indicator-offset.md`.

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
  visual style on `Button` and `SegmentControl`.
- `onValueChange` receives a hex string rather than a React Aria `Color`,
  matching `SegmentControl` and keeping React Aria types out of consumer code.
- Items are a flat `items` array rather than compound children, also matching
  `SegmentControl`.
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

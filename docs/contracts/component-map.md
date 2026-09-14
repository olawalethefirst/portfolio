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

## ColorSwatch

File: `src/components/ui/ColorSwatch.tsx`

```ts
type ColorSwatchSize = "sm" | "md" | "lg";
type ColorSwatchShape = "circle" | "square";

interface ColorSwatchProps {
  color: string;
  colorName?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: ColorSwatchSize;
  shape?: ColorSwatchShape;
  className?: string;
}
```

Maps to HeroUI `ColorSwatch`. `isSelected` and `isDisabled` are exposed as data state attributes. Concrete CSS colors use the native HeroUI primitive; CSS variable mappings such as `var(--accent)` use the same HeroUI swatch class contract because React Aria's color parser does not accept CSS variables.

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

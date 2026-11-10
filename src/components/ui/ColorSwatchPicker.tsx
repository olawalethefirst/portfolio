"use client";

import { ColorSwatchPicker as HeroUIColorSwatchPicker } from "@heroui/react/color-swatch-picker";
import type { ColorSwatchPickerProps as HeroUIColorSwatchPickerProps } from "@heroui/react/color-swatch-picker";
import type { ReactNode } from "react";
import { cn } from "./utils";

export type ColorSwatchPickerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ColorSwatchPickerShape = "circle" | "square";
export type ColorSwatchPickerLayout = "grid" | "stack";

export interface ColorSwatchPickerItem {
  /**
   * The swatch colour.
   *
   * Must be a colour React Aria can parse: hex, `rgb()`, or `hsl()`. It cannot
   * be `oklch()` or a `var(--token)` reference, because React Aria parses this
   * into a `Color` object and its colour model only covers hex, rgb, hsl, and
   * hsb. Passing anything else throws `Invalid color value` at render.
   *
   * This is why the value is a real colour rather than a placeholder styled by
   * CSS: HeroUI derives the selected checkmark's light-or-dark treatment from
   * this colour's luminance, so a swatch painted by CSS to something else would
   * get its contrast computed against a colour nobody can see.
   */
  color: string;
  /**
   * Human-readable name for the swatch.
   *
   * Required, because a bare colour has no accessible name. It is passed to the
   * swatch as `colorName` and shown in a tooltip on hover and keyboard focus.
   * Without it React Aria generates a description such as "dark vibrant lime",
   * which is wrong whenever the swatch means something (a theme, a brand
   * colour) rather than merely being a colour.
   */
  label: string;
  isDisabled?: boolean;
}

export interface ColorSwatchPickerProps
  extends Omit<
    HeroUIColorSwatchPickerProps,
    | "children"
    | "className"
    | "defaultValue"
    | "layout"
    | "onChange"
    | "size"
    | "value"
    | "variant"
  > {
  items: ColorSwatchPickerItem[];
  value?: string;
  defaultValue?: string;
  /** Receives the selected colour as a hex string, e.g. `#7f9c16`. */
  onValueChange?: (value: string) => void;
  size?: ColorSwatchPickerSize;
  /**
   * Swatch shape.
   *
   * Maps to HeroUI's `variant`. It is renamed because `variant` already means
   * visual style on `Button` and `Tabs`, so reusing it for
   * circle-versus-square would collide with an established meaning in this
   * design system.
   */
  shape?: ColorSwatchPickerShape;
  layout?: ColorSwatchPickerLayout;
  className?: string;
}

/**
 * The hover and focus tooltip.
 *
 * This is a plain positioned element rather than the HeroUI `Tooltip`, because
 * `Tooltip.Trigger` renders a `div` with `role="button"` and a tab stop.
 * Wrapping an item in one breaks React Aria's collection building and puts a
 * button between the listbox and its options; nesting one inside an item puts a
 * focusable button inside `role="option"`, which is invalid and competes with
 * the listbox's roving tabindex. HeroUI exposes hover and focus as data
 * attributes on the item, so driving the tooltip from CSS avoids all of that and
 * additionally works for keyboard users, which a hover-only tooltip would not.
 *
 * It is `aria-hidden` because the same text already reaches assistive
 * technology through the swatch's `colorName`; exposing it twice would make the
 * option announce its name twice.
 */
function SwatchTooltip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2",
        "whitespace-nowrap rounded-md bg-overlay px-2 py-1",
        "text-xs font-medium text-overlay-foreground shadow-sm",
        "opacity-0 transition-opacity duration-150",
        "group-data-[hovered=true]:opacity-100",
        "group-data-[focus-visible=true]:opacity-100",
      )}
    >
      {children}
    </span>
  );
}

export function ColorSwatchPicker({
  items,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  shape = "circle",
  layout = "grid",
  className,
  "aria-label": ariaLabel = "Color picker",
  ...props
}: ColorSwatchPickerProps) {
  return (
    <HeroUIColorSwatchPicker
      {...props}
      aria-label={ariaLabel}
      className={className}
      defaultValue={defaultValue}
      layout={layout}
      onChange={(color) => onValueChange?.(color.toString("hex"))}
      size={size}
      value={value}
      variant={shape}
    >
      {items.map((item) => (
        <HeroUIColorSwatchPicker.Item
          key={item.color}
          className="group relative"
          color={item.color}
          isDisabled={item.isDisabled}
        >
          <HeroUIColorSwatchPicker.Swatch colorName={item.label} />
          <HeroUIColorSwatchPicker.Indicator />
          <SwatchTooltip>{item.label}</SwatchTooltip>
        </HeroUIColorSwatchPicker.Item>
      ))}
    </HeroUIColorSwatchPicker>
  );
}

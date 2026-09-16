"use client";

import { Slider as HeroUISlider } from "@heroui/react/slider";
import type { SliderProps as HeroUISliderProps } from "@heroui/react/slider";
import { cn } from "./utils";

export interface SliderProps
  extends Omit<
    HeroUISliderProps,
    | "children"
    | "className"
    | "defaultValue"
    | "onChange"
    | "onChangeEnd"
    | "orientation"
    | "value"
  > {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueChangeEnd?: (value: number) => void;
  className?: string;
}

export function Slider({
  value,
  defaultValue,
  onValueChange,
  onValueChangeEnd,
  className,
  ...props
}: SliderProps) {
  return (
    <HeroUISlider
      {...props}
      className={cn("block w-full", className)}
      defaultValue={defaultValue}
      onChange={(nextValue) => {
        if (typeof nextValue === "number") onValueChange?.(nextValue);
      }}
      onChangeEnd={(nextValue) => {
        if (typeof nextValue === "number") onValueChangeEnd?.(nextValue);
      }}
      orientation="horizontal"
      value={value}
    >
      <div className="flex w-full items-center gap-3">
        <HeroUISlider.Track className="relative h-5 min-w-0 flex-1 border-x-0 bg-transparent">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-default"
          />
          <HeroUISlider.Fill className="top-1/2 h-0.5 -translate-y-1/2 rounded-full" />
          <HeroUISlider.Thumb />
        </HeroUISlider.Track>
        <HeroUISlider.Output className="shrink-0 whitespace-nowrap text-end" />
      </div>
    </HeroUISlider>
  );
}

"use client";

import { TextArea as HeroUITextArea, type TextAreaProps as HeroUITextAreaProps } from "@heroui/react/textarea";

import { fieldClassName } from "./field-styles";
import { cn } from "./utils";

export interface TextAreaProps extends Omit<HeroUITextAreaProps, "className"> {
  className?: string;
}

export function TextArea({ className, ...props }: TextAreaProps) {
  return <HeroUITextArea {...props} className={cn(fieldClassName, "resize-none overflow-y-auto", className)} />;
}

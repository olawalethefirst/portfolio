"use client";

import { Toolbar } from "@heroui/react/toolbar";
import { Bold, Italic, Link, TextQuote } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import type { MarkdownFormat } from "./markdown-formatting";

const commands = {
  bold: { label: "Bold", Icon: Bold },
  italic: { label: "Italic", Icon: Italic },
  link: { label: "Insert link", Icon: Link },
  quote: { label: "Quote", Icon: TextQuote },
};

export function MarkdownToolbar({ formats, preview, isDisabled, onFormat, onTogglePreview }: {
  formats: readonly MarkdownFormat[];
  preview: boolean;
  isDisabled?: boolean;
  onFormat: (format: MarkdownFormat) => void;
  onTogglePreview: () => void;
}) {
  return (
    <Toolbar aria-label="Markdown formatting" className="flex w-full flex-wrap gap-1 border-b border-border p-2">
      {formats.map((format) => {
        const { label, Icon } = commands[format];
        return <Button key={format} aria-label={label} title={label} variant="ghost" size="sm" isIconOnly isDisabled={isDisabled || preview} onPress={() => onFormat(format)}><Icon aria-hidden="true" className="size-4" /></Button>;
      })}
      <Button className="ml-auto" variant="ghost" size="sm" isDisabled={isDisabled} onPress={onTogglePreview}>{preview ? "Write" : "Preview"}</Button>
    </Toolbar>
  );
}

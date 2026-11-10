"use client";

import { Popover } from "@heroui/react/popover";
import { Tooltip } from "@heroui/react/tooltip";
import { Bold, Code, FileCode2, ImagePlus, Italic, Link, List, ListOrdered, TextQuote } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { ArticleFormat, ArticleInsertion } from "@/src/components/markdown-field/article-formatting";
import { Button } from "@/src/components/ui/Button";

const commands = [
  { format: "bold", label: "Bold", Icon: Bold },
  { format: "italic", label: "Italics", Icon: Italic },
  { format: "bullet-list", label: "Bulleted list", Icon: List },
  { format: "numbered-list", label: "Numbered list", Icon: ListOrdered },
  { format: "quote", label: "Quote", Icon: TextQuote },
  { format: "inline-code", label: "Inline code", Icon: Code },
] as const;

function FormattingButton({ label, children, onPress }: { label: string; children: ReactNode; onPress?: () => void }) {
  // The actual button consumes the tooltip context; Tooltip.Trigger would add
  // another focusable wrapper around an already interactive control.
  return <Tooltip delay={300} closeDelay={0}>
    <Button variant="ghost" size="sm" isIconOnly aria-label={label} className="min-h-11 min-w-11" onPress={onPress}>{children}</Button>
    <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
  </Tooltip>;
}

const headingLevels = [1, 2, 3, 4, 5, 6] as const;

export function ArticleToolbar({ onFormat, onInsert }: {
  onFormat: (format: ArticleFormat) => void;
  onInsert: (kind: ArticleInsertion["kind"]) => void;
}) {
  const [headingsOpen, setHeadingsOpen] = useState(false);
  return <div role="group" aria-label="Article formatting" className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 border-b border-border px-5 py-2 sm:px-8">
    <Popover isOpen={headingsOpen} onOpenChange={setHeadingsOpen}>
      <FormattingButton label="Headings"><span aria-hidden="true" className="text-lg font-normal">H</span></FormattingButton>
      <Popover.Content placement="bottom start" className="min-w-40">
        <Popover.Dialog aria-label="Heading level" className="flex flex-col p-1">
          {headingLevels.map((level) => <Button key={level} aria-label={`Heading ${level}`} variant="ghost" className="min-h-11 justify-start gap-3"
            onPress={() => {
              setHeadingsOpen(false);
              // Apply after the popover restores focus so the caret returns to
              // the source rather than ending on the heading trigger.
              requestAnimationFrame(() => onFormat(`heading-${level}`));
            }}>
            <span aria-hidden="true" className="w-7 font-semibold">H{level}</span>
          </Button>)}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
    {commands.map(({ format, label, Icon }) => <FormattingButton key={format} label={label} onPress={() => onFormat(format)}><Icon aria-hidden="true" className="size-4" /></FormattingButton>)}
    <FormattingButton label="Insert code block" onPress={() => onInsert("code")}><FileCode2 aria-hidden="true" className="size-4" /></FormattingButton>
    {([{ kind: "link", label: "Insert link", Icon: Link }, { kind: "image", label: "Insert image", Icon: ImagePlus }] as const).map(({ kind, label, Icon }) =>
      <FormattingButton key={kind} label={label} onPress={() => onInsert(kind)}><Icon aria-hidden="true" className="size-4" /></FormattingButton>)}
  </div>;
}

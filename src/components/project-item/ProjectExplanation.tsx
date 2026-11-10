"use client";

import { Popover } from "@heroui/react/popover";

import { Button } from "../ui/Button";

interface ProjectExplanationProps {
  name: string;
  what: string;
  how: string;
}

export function ProjectExplanation({
  name,
  what,
  how,
}: ProjectExplanationProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["what", "how"] as const).map((kind) => {
        const label = kind === "what" ? "What" : "How";

        return (
          <Popover key={kind}>
            <Button
              aria-label={kind === "what" ? `What? About ${name}` : `How? ${name} works`}
              className="min-h-11 px-4 aria-expanded:ring-1 aria-expanded:ring-foreground/30"
              size="sm"
              variant="tertiary"
            >
              {label}?
            </Button>
            <Popover.Content
              className="z-50 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-overlay text-foreground motion-reduce:animate-none"
              containerPadding={16}
              placement="top start"
            >
              <Popover.Dialog
                aria-label={`${label} — ${name}`}
                className="max-h-[min(24rem,calc(100dvh-2rem))] overflow-y-auto p-4 outline-none"
              >
                <Popover.Heading className="mb-2 text-sm font-semibold" level={3}>
                  {label}
                </Popover.Heading>
                <p className="text-sm leading-6 text-muted">
                  {kind === "what" ? what : how}
                </p>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        );
      })}
    </div>
  );
}

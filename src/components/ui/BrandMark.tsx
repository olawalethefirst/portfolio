import { cn } from "./utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-label="Brand logo"
      role="img"
      className={cn(
        "block size-10 shrink-0 bg-foreground [mask-image:url('/logo.svg')] [mask-size:contain] [mask-repeat:no-repeat]",
        className,
      )}
    />
  );
}

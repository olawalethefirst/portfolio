import type { ComponentPropsWithRef } from "react";

import { cn } from "./utils";

/** The shared content boundary; reuse the string where the element must stay stable. */
export const sectionContainerClassName = "container mx-auto px-4 sm:px-6";

export function SectionContainer({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={cn(sectionContainerClassName, className)}
    />
  );
}

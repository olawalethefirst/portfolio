import type { ComponentPropsWithRef } from "react";

import { cn } from "./utils";

export function SectionContainer({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={cn("container mx-auto px-4 sm:px-6", className)}
    />
  );
}

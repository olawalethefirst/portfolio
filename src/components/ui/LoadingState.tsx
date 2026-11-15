"use client";

import { Spinner } from "@heroui/react/spinner";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-40 w-full items-center justify-center">
      <Spinner size="sm" aria-label={label} />
    </div>
  );
}

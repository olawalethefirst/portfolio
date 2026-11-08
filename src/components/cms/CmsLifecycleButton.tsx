"use client";

import { EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

export function CmsLifecycleButton({
  action,
  confirmation = false,
  children,
  onPress,
  disabled = false,
  pending = false,
  "aria-label": label,
}: {
  action: "delete" | "unpublish";
  confirmation?: boolean;
  children: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  "aria-label"?: string;
}) {
  const variant = action === "delete" ? (confirmation ? "danger" : "danger-soft") : "outline";
  const Icon = action === "unpublish" ? EyeOff : confirmation ? Trash2 : null;
  return (
    <Button variant={variant} isDisabled={disabled} isLoading={pending}
      aria-label={label} onPress={onPress}
      startContent={Icon ? <Icon aria-hidden="true" className="size-4" /> : undefined}>
      {children}
    </Button>
  );
}

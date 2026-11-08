"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

export function CmsBackButton({ children, onPress, disabled = false }: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-6">
      <Button variant="ghost" isDisabled={disabled} onPress={onPress}
        startContent={<ArrowLeft aria-hidden="true" className="size-4" />}>
        {children}
      </Button>
    </div>
  );
}

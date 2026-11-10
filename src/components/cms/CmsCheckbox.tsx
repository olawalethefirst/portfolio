"use client";

import { Checkbox } from "@heroui/react/checkbox";
import { Label } from "@heroui/react/label";
import type { ReactNode } from "react";

export function CmsCheckbox({ children, value, onChange, disabled = false }: {
  children: ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return <Checkbox isSelected={value} onChange={onChange} isDisabled={disabled}>
    <Checkbox.Content className="min-h-11">
      <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
      <Label className="text-sm">{children}</Label>
    </Checkbox.Content>
  </Checkbox>;
}

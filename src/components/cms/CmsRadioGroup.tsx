"use client";

import { Label, Radio, RadioGroup } from "@heroui/react";

export function CmsRadioGroup<Value extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <RadioGroup name={name} value={value} onChange={(next) => {
      const option = options.find((item) => item.value === next);
      if (option) onChange(option.value);
    }}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <Radio key={option.value} value={option.value}>
            <Radio.Content className="min-h-11">
              <Radio.Control><Radio.Indicator /></Radio.Control>
              <Label>{option.label}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

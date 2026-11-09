"use client";

import { Description, FieldError, Label, TextField } from "@heroui/react";
import type { ReactNode } from "react";
import { Input } from "@/src/components/ui/Input";
import { TextArea } from "@/src/components/ui/TextArea";

export function CmsField({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  multiline,
  type = "text",
  icon,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  multiline?: "short" | "article";
  type?: "text" | "url" | "date" | "search";
  icon?: ReactNode;
}) {
  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isInvalid={Boolean(error)}
      className="w-full"
      validationBehavior="aria"
    >
      <Label className="text-sm font-medium">{label}</Label>
      {hint ? (
        <Description className="text-xs leading-5 text-muted">
          {hint}
        </Description>
      ) : null}
      {multiline ? (
        <TextArea
          className={
            multiline === "article"
              ? "min-h-96 font-mono text-sm leading-7"
              : "min-h-28 leading-6"
          }
        />
      ) : (
        <Input type={type} startContent={icon} />
      )}
      {error ? (
        <FieldError className="text-sm text-danger">{error}</FieldError>
      ) : null}
    </TextField>
  );
}

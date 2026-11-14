"use client";

import { Description, FieldError, Label, TextField } from "@heroui/react";
import type { ReactNode } from "react";
import { Button } from "@/src/components/ui/Button";
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
  savedValue,
  draftValue,
  reviewLabel,
  isDisabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string, source?: "saved" | "draft") => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  multiline?: "short" | "article";
  type?: "text" | "url" | "date" | "search";
  icon?: ReactNode;
  savedValue?: string;
  draftValue?: string;
  reviewLabel?: string;
  isDisabled?: boolean;
}) {
  const useSaved = value === draftValue;
  const actionLabel = useSaved ? "Use saved" : "Use draft";
  return (
    <TextField
      name={name}
      value={value}
      onChange={(next) => onChange(next)}
      isDisabled={isDisabled}
      onBlur={onBlur}
      isInvalid={Boolean(error)}
      className="w-full"
      validationBehavior="aria"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        {draftValue !== undefined && savedValue !== undefined ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            isDisabled={isDisabled}
            aria-label={`${actionLabel} ${reviewLabel ?? label}`}
            onPress={() => onChange(useSaved ? savedValue : draftValue, useSaved ? "saved" : "draft")}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
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

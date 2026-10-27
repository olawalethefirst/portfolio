"use client";

import { FieldError, Label, TextField } from "@heroui/react";
import { useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { TextArea } from "@/src/components/ui/TextArea";
import { cn } from "@/src/components/ui/utils";
import { CommentMarkdown } from "./CommentMarkdown";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { formatMarkdown, type MarkdownFormat, type TextSelection } from "./markdown-formatting";

export interface MarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  name?: string;
  placeholder?: string;
  formats?: readonly MarkdownFormat[];
  variant?: "primary" | "secondary";
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  maxLength?: number;
  editorHeightClassName?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
}

export function MarkdownField({ value, onChange, label, name, placeholder, formats = ["bold", "italic", "link", "quote"], variant = "primary", isRequired, isInvalid, errorMessage, isDisabled, maxLength, editorHeightClassName = "h-28", textareaRef }: MarkdownFieldProps) {
  const [preview, setPreview] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [restore, setRestore] = useState<TextSelection | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<TextSelection>({ start: 0, end: 0 });
  useImperativeHandle(textareaRef, () => textarea.current!);

  useLayoutEffect(() => {
    if (!preview && restore && textarea.current) {
      textarea.current.focus();
      textarea.current.setSelectionRange(restore.start, restore.end);
      selection.current = restore;
    }
  }, [preview, restore, value]);

  function saveSelection() {
    if (textarea.current) selection.current = { start: textarea.current.selectionStart, end: textarea.current.selectionEnd };
  }

  return (
    <TextField fullWidth name={name} value={value} onChange={(text) => { setRestore(null); setLimitMessage(""); onChange(text); }} variant={variant} isRequired={isRequired} isInvalid={isInvalid} isDisabled={isDisabled}>
      <Label>{label}</Label>
      <div className={cn("markdown-field outlined-field border border-field-border focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/35", variant === "secondary" && "markdown-field--secondary", isInvalid && "border-danger!")}>
        <MarkdownToolbar formats={formats} preview={preview} isDisabled={isDisabled} onFormat={(format) => {
          const result = formatMarkdown(value, selection.current, format, maxLength);
          if (!result) {
            setLimitMessage(`Formatting would exceed the ${maxLength} character limit.`);
            setRestore({ ...selection.current });
            return;
          }
          setLimitMessage("");
          onChange(result.text);
          setRestore(result.selection);
        }} onTogglePreview={() => {
          if (!preview) { saveSelection(); setPreview(true); }
          else { setRestore({ ...selection.current }); setPreview(false); }
        }} />
        {preview ? (
          <div role="region" aria-label={`${label} preview`} tabIndex={0} className={cn("overflow-y-auto px-4 py-3 outline-none", editorHeightClassName)}>
            {value.trim() ? <CommentMarkdown>{value}</CommentMarkdown> : <p className="text-muted">Nothing to preview yet.</p>}
          </div>
        ) : (
          <TextArea ref={textarea} className={cn("border-0! shadow-none! ring-0!", editorHeightClassName)} placeholder={placeholder} maxLength={maxLength} onSelect={saveSelection} onBlur={saveSelection} />
        )}
      </div>
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
      <p role="status" className="text-xs text-muted">{limitMessage}</p>
    </TextField>
  );
}

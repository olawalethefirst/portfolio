"use client";

import { FieldError, Form, Label, TextField } from "@heroui/react";
import { MessageSquarePlus, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { MarkdownField, type MarkdownFieldHandle } from "@/src/components/markdown-field/MarkdownField";
import { Surface } from "../ui/Surface";

interface CommentFormProps {
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: (text: string) => void;
  recipient?: string;
  onCancel?: () => void;
}

export function CommentForm({ name, onNameChange, onSubmit, recipient, onCancel }: CommentFormProps) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<{ name?: string; text?: string }>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editor = useRef<MarkdownFieldHandle>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    if (recipient) textarea.current?.focus();
  }, [recipient]);

  useEffect(() => {
    if (errors.name) nameInput.current?.focus();
    else if (errors.text) textarea.current?.focus();
  }, [errors, editorVersion]);

  return (
    <Surface className="border border-border p-5 sm:p-6 bg-transparent" variant="secondary">

    <Form
      aria-label={recipient ? `Reply to ${recipient}` : "New comment"}
      className="flex w-full flex-col gap-5"
      validationBehavior="aria"
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors = {
          name: name.trim() ? undefined : "Enter your name.",
          text: text.trim() ? undefined : "Enter a comment.",
        };
        setErrors(nextErrors);
        if (nextErrors.name || nextErrors.text) {
          editor.current?.showWrite();
          return;
        }
        setEditorVersion((version) => version + 1);
        onSubmit(text.trim());
        setText("");
      }}
    >
      {recipient ? <p className="text-sm text-muted">Replying to <span className="font-medium text-foreground">@{recipient}</span></p> : null}
      <TextField fullWidth isRequired isInvalid={Boolean(errors.name)} value={name} onChange={onNameChange} variant="secondary">
        <Label>Name</Label>
        <Input ref={nameInput} autoComplete="name" maxLength={80} startContent={<UserRound />} />
        {errors.name ? <FieldError>{errors.name}</FieldError> : null}
      </TextField>
      <MarkdownField
        key={editorVersion}
        label={recipient ? "Reply" : "Comment"}
        value={text}
        onChange={setText}
        variant="secondary"
        isRequired
        isInvalid={Boolean(errors.text)}
        errorMessage={errors.text}
        textareaRef={textarea}
        editorRef={editor}
        maxLength={5000}
        placeholder={recipient ? "Continue the conversation…" : "Share your perspective…"}
      />
      <div className="flex w-full flex-wrap items-center justify-end gap-3">
        {onCancel ? <Button variant="ghost" size="sm" onPress={onCancel}>Cancel</Button> : null}
        <Button type="submit" size="sm" startContent={<MessageSquarePlus aria-hidden="true" className="size-4" />}>Post</Button>
      </div>
    </Form></Surface>
  );
}

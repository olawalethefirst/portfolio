"use client";

import { FieldError, Form, Label, TextField } from "@heroui/react";
import { MessageSquarePlus, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import {
  MarkdownField,
  type MarkdownFieldHandle,
} from "@/src/components/markdown-field/MarkdownField";
import { Surface } from "../ui/Surface";

export type CommentSubmitResult =
  | { ok: true }
  | {
      ok: false;
      message?: string;
      fieldErrors?: { name?: string; text?: string };
    };

interface CommentFormProps {
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: (text: string) => Promise<CommentSubmitResult>;
  recipient?: string;
  onCancel?: () => void;
}

export function CommentForm({
  name,
  onNameChange,
  onSubmit,
  recipient,
  onCancel,
}: CommentFormProps) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<{ name?: string; text?: string }>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editor = useRef<MarkdownFieldHandle>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string>();
  const submitting = useRef(false);

  useEffect(() => {
    if (recipient) textarea.current?.focus();
  }, [recipient]);

  useEffect(() => {
    if (errors.name) nameInput.current?.focus();
    else if (errors.text) textarea.current?.focus();
  }, [errors, editorVersion]);

  return (
    <Surface
      className="border border-border p-5 sm:p-6 bg-transparent"
      variant="secondary"
    >
      <Form
        aria-label={recipient ? `Reply to ${recipient}` : "New comment"}
        className="flex w-full flex-col gap-5"
        validationBehavior="aria"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          const nextErrors = {
            name: name.trim() ? undefined : "Enter your name.",
            text: text.trim() ? undefined : "Enter a comment.",
          };
          setErrors(nextErrors);
          if (nextErrors.name || nextErrors.text) {
            editor.current?.showWrite();
            return;
          }
          submitting.current = true;
          setPending(true);
          setFormError(undefined);
          const result = await onSubmit(text.trim());
          submitting.current = false;
          setPending(false);
          if (result.ok) {
            setEditorVersion((version) => version + 1);
            setText("");
            return;
          }
          setErrors(result.fieldErrors ?? {});
          setFormError(result.message);
        }}
      >
        {recipient ? (
          <p className="text-sm text-muted">
            Replying to{" "}
            <span className="font-medium text-foreground">@{recipient}</span>
          </p>
        ) : null}
        <TextField
          fullWidth
          isRequired
          isInvalid={Boolean(errors.name)}
          value={name}
          onChange={onNameChange}
          variant="secondary"
        >
          <Label>Name</Label>
          <Input
            ref={nameInput}
            autoComplete="name"
            maxLength={80}
            startContent={<UserRound />}
          />
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
          placeholder={
            recipient ? "Continue the conversation…" : "Share your perspective…"
          }
        />
        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          {onCancel ? (
            <Button
              variant="ghost"
              size="sm"
              isDisabled={pending}
              onPress={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            isLoading={pending}
            startContent={
              <MessageSquarePlus aria-hidden="true" className="size-4" />
            }
          >
            Post
          </Button>
        </div>
      </Form>
    </Surface>
  );
}

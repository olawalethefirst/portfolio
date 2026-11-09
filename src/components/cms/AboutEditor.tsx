"use client";

import { Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { Form } from "@heroui/react";
import { useId, useRef, useState } from "react";
import { useAbout } from "@/src/cms/AboutProvider";
import { sameAbout, validateAbout, type AboutDraft, type AboutErrors } from "@/src/cms/about";
import { Button } from "@/src/components/ui/Button";
import { CmsField } from "./CmsField";
import { CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { useWorkingDraft } from "@/src/cms/working-drafts";

const AboutPreview = dynamic(() => import("./AboutPreview").then((module) => module.AboutPreview), {
  ssr: false,
  loading: () => <p role="status">Loading About preview…</p>,
});

export function AboutEditor() {
  const { saved, save, pending, working } = useAbout();
  const { value, setValue } = useWorkingDraft(working, "about", () => saved);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const revision = useRef(0);
  const [exposed, setExposed] = useState<Partial<Record<keyof AboutDraft, boolean>>>({});
  const currentErrors = validateAbout(value);
  const errors: AboutErrors = {
    heading: exposed.heading ? currentErrors.heading : undefined,
    biography: exposed.biography ? currentErrors.biography : undefined,
  };
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const dirty = !sameAbout(value, saved);

  function changeField(field: keyof AboutDraft, text: string) {
    revision.current += 1;
    setError("");
    setMessage("");
    setValue((current) => ({ ...current, [field]: text }));
  }

  function focusFirstError(nextErrors: AboutErrors) {
    const first = (["heading", "biography"] as const).find((field) => nextErrors[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError("");
    setMessage("");
    const nextErrors = validateAbout(value);
    setExposed({ heading: true, biography: true });
    if (Object.values(nextErrors).some(Boolean)) {
      focusFirstError(nextErrors);
      return false;
    }
    const submittedRevision = revision.current;
    try {
      await save(value);
      if (revision.current === submittedRevision) setMessage("Saved.");
      return true;
    } catch (failure) {
      if (revision.current === submittedRevision) setError(failure instanceof Error ? failure.message : "Save failed. Your edits are still here.");
      return false;
    }
  }

  if (preview) return <CmsPreviewFrame label="About preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><AboutPreview value={value} /></CmsPreviewFrame>;
  return <>
    <CmsPageHeader title="About" description="Edit your introduction and biography. The conversation CTA stays fixed." />
    <CmsToolbar actions={<Button type="submit" form={formId} variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />}>Save changes</Button>}>
      <Button type="button" id="about-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("about-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="About save status" error={error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <Form id={formId} ref={formRef} className="block" validationBehavior="aria" onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
    <CmsEditorContent><CmsFieldSection title="Content">
      <CmsField name="heading" label="Heading" value={value.heading} error={errors.heading} onBlur={() => setExposed((current) => ({ ...current, heading: true }))} onChange={(heading) => changeField("heading", heading)} />
      <CmsField name="biography" label="Biography" multiline="short" value={value.biography} error={errors.biography} onBlur={() => setExposed((current) => ({ ...current, biography: true }))} onChange={(biography) => changeField("biography", biography)} />
    </CmsFieldSection></CmsEditorContent>
    </Form>
    <CmsFooter><Button type="button" variant="ghost" isDisabled={pending || !dirty} onPress={() => { revision.current += 1; setValue(saved); setExposed({}); setError(""); setMessage(""); }}>Discard changes</Button></CmsFooter>
  </>;
}

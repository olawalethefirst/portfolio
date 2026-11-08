"use client";

import { Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useAbout } from "@/src/cms/AboutProvider";
import { sameAbout, validateAbout, type AboutErrors } from "@/src/cms/about";
import { Button } from "@/src/components/ui/Button";
import { CmsField } from "./CmsField";
import { CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { useWorkingDraft } from "@/src/cms/working-drafts";

const AboutPreview = dynamic(() => import("./AboutPreview").then((module) => module.AboutPreview), {
  ssr: false,
  loading: () => <p role="status">Loading About preview…</p>,
});

export function AboutEditor() {
  const { saved, save, pending, working } = useAbout();
  const { value, setValue } = useWorkingDraft(working, "about", () => saved);
  const [errors, setErrors] = useState<AboutErrors>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const dirty = !sameAbout(value, saved);

  function focusFirstError(nextErrors: AboutErrors) {
    const first = Object.keys(nextErrors)[0];
    if (first) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError("");
    setMessage("");
    const nextErrors = validateAbout(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return false;
    }
    try {
      await save(value);
      setMessage("Saved.");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Save failed. Your edits are still here.");
      return false;
    }
  }

  if (preview) return <CmsPreviewFrame label="About preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><AboutPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="about">
    <CmsPageHeader title="About" description="Edit your introduction and biography. The conversation CTA stays fixed." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>
      <Button id="about-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("about-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="About save status" error={error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <CmsEditorContent><CmsFieldSection title="Content">
      <CmsField name="heading" label="Heading" value={value.heading} error={errors.heading} onChange={(heading) => setValue((current) => ({ ...current, heading }))} />
      <CmsField name="biography" label="Biography" multiline="short" value={value.biography} error={errors.biography} onChange={(biography) => setValue((current) => ({ ...current, biography }))} />
    </CmsFieldSection></CmsEditorContent>
    <CmsFooter><Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(saved); setErrors({}); setError(""); setMessage(""); }}>Discard changes</Button></CmsFooter>
  </CmsShell>;
}

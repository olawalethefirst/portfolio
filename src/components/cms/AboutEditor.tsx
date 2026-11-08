"use client";

import { Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAbout } from "@/src/cms/AboutProvider";
import { sameAbout, validateAbout, type AboutErrors } from "@/src/cms/about";
import { Button } from "@/src/components/ui/Button";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsField } from "./CmsField";
import { CmsDemoControls, CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { CmsUnsavedChangesDialog, useCmsUnsavedChanges } from "./CmsUnsavedChanges";

const AboutPreview = dynamic(() => import("./AboutPreview").then((module) => module.AboutPreview), {
  ssr: false,
  loading: () => <p role="status">Loading About preview…</p>,
});

export function AboutEditor() {
  const router = useRouter();
  const { saved, save, pending, failNext, setFailNext } = useAbout();
  const [value, setValue] = useState(saved);
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
      if (navigation.dialog.open) setError("Complete the required About fields before saving. Choose Stay to correct them.");
      else focusFirstError(nextErrors);
      return false;
    }
    try {
      await save(value);
      setMessage("Saved in demo.");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Save failed. Your edits are still here.");
      return false;
    }
  }
  const navigation = useCmsUnsavedChanges({ dirty, pending, save: saveChanges, navigate: (path) => router.push(path) });
  const leave = navigation.leave;

  if (preview) return <CmsPreviewFrame label="About preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><AboutPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="about" onHero={() => leave("/admin/hero")} onProjects={() => leave("/admin/projects")} onPublications={() => leave("/admin/publications")} onAbout={() => leave("/admin/about")} onSocial={() => leave("/admin/social")}>
    <CmsPageHeader title="About" description="Edit your introduction and biography. The conversation CTA stays fixed." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>
      <Button id="about-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("about-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="About save status" error={navigation.dialog.open ? undefined : error}>{pending ? "Saving in demo…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <CmsEditorContent><CmsFieldSection title="Content">
      <CmsField name="heading" label="Heading" value={value.heading} error={errors.heading} onChange={(heading) => setValue((current) => ({ ...current, heading }))} />
      <CmsField name="biography" label="Biography" multiline="short" value={value.biography} error={errors.biography} onChange={(biography) => setValue((current) => ({ ...current, biography }))} />
    </CmsFieldSection></CmsEditorContent>
    <CmsFooter><Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(saved); setErrors({}); setError(""); setMessage(""); }}>Discard changes</Button></CmsFooter>
    <CmsDemoControls><CmsCheckbox value={failNext} disabled={pending} onChange={setFailNext}>Fail next save</CmsCheckbox></CmsDemoControls>
    <CmsUnsavedChangesDialog {...navigation.dialog} error={error} onStay={() => { navigation.dialog.onStay(); focusFirstError(errors); }} />
  </CmsShell>;
}

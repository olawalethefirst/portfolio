"use client";

import { Link, Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SOCIAL_PROFILES } from "@/src/components/contact-conversation/social-profiles";
import { useSocial } from "@/src/cms/SocialProvider";
import { sameSocial, validateSocial, type SocialErrors } from "@/src/cms/social";
import { Button } from "@/src/components/ui/Button";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsField } from "./CmsField";
import { CmsDemoControls, CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { CmsUnsavedChangesDialog, useCmsUnsavedChanges } from "./CmsUnsavedChanges";

const SocialPreview = dynamic(() => import("./SocialPreview").then((module) => module.SocialPreview), {
  ssr: false,
  loading: () => <p role="status">Loading social profiles preview…</p>,
});

export function SocialEditor() {
  const router = useRouter();
  const { saved, save, pending, failNext, setFailNext } = useSocial();
  const [value, setValue] = useState(saved);
  const [errors, setErrors] = useState<SocialErrors>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const dirty = !sameSocial(value, saved);

  function focusFirstError(nextErrors: SocialErrors) {
    const first = Object.keys(nextErrors)[0];
    if (first) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError("");
    setMessage("");
    const nextErrors = validateSocial(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (navigation.dialog.open) setError("Correct the social profile URLs before saving. Choose Stay to correct them.");
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

  if (preview) return <CmsPreviewFrame label="Social profiles preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><SocialPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="social" onAbout={() => leave("/admin/about")} onHero={() => leave("/admin/hero")} onProjects={() => leave("/admin/projects")} onPublications={() => leave("/admin/publications")} onSocial={() => leave("/admin/social")}>
    <CmsPageHeader title="Social profiles" description="Edit your GitHub, LinkedIn and X destinations. Profile labels and icons stay fixed." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>
      <Button id="social-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("social-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="Social profiles save status" error={navigation.dialog.open ? undefined : error}>{pending ? "Saving in demo…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <CmsEditorContent><CmsFieldSection title="Content">
      {SOCIAL_PROFILES.map(({ id, label }) => <CmsField key={id} name={id} label={`${label} URL`} type="url" icon={<Link aria-hidden="true" className="size-4" />} hint="Enter a complete HTTPS profile URL." value={value[id]} error={errors[id]} onChange={(url) => setValue((current) => ({ ...current, [id]: url }))} />)}
    </CmsFieldSection></CmsEditorContent>
    <CmsFooter><Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(saved); setErrors({}); setError(""); setMessage(""); }}>Discard changes</Button></CmsFooter>
    <CmsDemoControls><CmsCheckbox value={failNext} disabled={pending} onChange={setFailNext}>Fail next save</CmsCheckbox></CmsDemoControls>
    <CmsUnsavedChangesDialog {...navigation.dialog} error={error} onStay={() => { navigation.dialog.onStay(); focusFirstError(errors); }} />
  </CmsShell>;
}

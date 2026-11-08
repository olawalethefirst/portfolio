"use client";

import { Link, Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { SOCIAL_PROFILES } from "@/src/components/contact-conversation/social-profiles";
import { useSocial } from "@/src/cms/SocialProvider";
import { sameSocial, validateSocial, type SocialErrors } from "@/src/cms/social";
import { Button } from "@/src/components/ui/Button";
import { CmsField } from "./CmsField";
import { CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { useWorkingDraft } from "@/src/cms/working-drafts";

const ContactPreview = dynamic(() => import("./ContactPreview").then((module) => module.ContactPreview), {
  ssr: false,
  loading: () => <p role="status">Loading social profiles preview…</p>,
});

export function ContactEditor() {
  const { saved, save, pending, working } = useSocial();
  const { value, setValue } = useWorkingDraft(working, "contact", () => saved);
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

  if (preview) return <CmsPreviewFrame label="Contact preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><ContactPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="contact">
    <CmsPageHeader title="Contact" description="Edit your GitHub, LinkedIn and X destinations. Profile labels and icons stay fixed." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>
      <Button id="social-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("social-preview-trigger"); setPreview(true); }}>Preview contact</Button>
    </CmsToolbar>
    <CmsFeedback label="Contact save status" error={error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <CmsEditorContent><CmsFieldSection title="Content">
      {SOCIAL_PROFILES.map(({ id, label }) => <CmsField key={id} name={id} label={`${label} URL`} type="url" icon={<Link aria-hidden="true" className="size-4" />} hint="Enter a complete HTTPS profile URL." value={value[id]} error={errors[id]} onChange={(url) => setValue((current) => ({ ...current, [id]: url }))} />)}
    </CmsFieldSection></CmsEditorContent>
    <CmsFooter><Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(saved); setErrors({}); setError(""); setMessage(""); }}>Discard changes</Button></CmsFooter>
  </CmsShell>;
}

"use client";

import { Link, Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { Form } from "@heroui/react";
import { useId, useRef, useState } from "react";
import { SOCIAL_PROFILES } from "@/src/components/contact-conversation/social-profiles";
import { useSocial } from "@/src/cms/SocialProvider";
import { sameSocial, validateSocial, type SocialDraft, type SocialErrors } from "@/src/cms/social";
import { Button } from "@/src/components/ui/Button";
import { CmsField } from "./CmsField";
import { CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import { useWorkingDraft } from "@/src/cms/working-drafts";

const ContactPreview = dynamic(() => import("./ContactPreview").then((module) => module.ContactPreview), {
  ssr: false,
  loading: () => <p role="status">Loading social profiles preview…</p>,
});

export function ContactEditor() {
  const { saved, save, pending, working } = useSocial();
  const { value, setValue, reset, ready, persistenceStatus } = useWorkingDraft(working, "contact", () => saved);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const revision = useRef(0);
  const [exposed, setExposed] = useState<Partial<Record<keyof SocialDraft, boolean>>>({});
  const currentErrors = validateSocial(value);
  const errors: SocialErrors = {};
  for (const { id } of SOCIAL_PROFILES) {
    if (exposed[id]) errors[id] = currentErrors[id];
  }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const dirty = !sameSocial(value, saved);

  function changeField(field: keyof SocialDraft, url: string) {
    revision.current += 1;
    setError("");
    setMessage("");
    setValue((current) => ({ ...current, [field]: url }));
  }

  function focusFirstError(nextErrors: SocialErrors) {
    const first = SOCIAL_PROFILES.find(({ id }) => nextErrors[id])?.id;
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError("");
    setMessage("");
    const nextErrors = validateSocial(value);
    setExposed({ github: true, linkedin: true, x: true });
    if (Object.keys(nextErrors).length) {
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

  if (!ready) return <p role="status">Restoring local draft…</p>;
  if (preview) return <CmsPreviewFrame label="Contact preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><ContactPreview value={value} /></CmsPreviewFrame>;
  return <>
    <CmsPageHeader title="Contact" description="Edit your GitHub, LinkedIn and X destinations. Profile labels and icons stay fixed." />
    <CmsToolbar actions={<Button type="submit" form={formId} variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />}>Save changes</Button>}>
      <Button type="button" id="social-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("social-preview-trigger"); setPreview(true); }}>Preview contact</Button>
    </CmsToolbar>
    <CmsDraftFeedback status={persistenceStatus} />
    <CmsFeedback label="Contact save status" error={error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <Form id={formId} ref={formRef} className="block" validationBehavior="aria" onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
    <CmsEditorContent><CmsFieldSection title="Content">
      {SOCIAL_PROFILES.map(({ id, label }) => <CmsField key={id} name={id} label={`${label} URL`} type="url" icon={<Link aria-hidden="true" className="size-4" />} hint="Enter a complete HTTPS profile URL." value={value[id]} error={errors[id]} onBlur={() => setExposed((current) => ({ ...current, [id]: true }))} onChange={(url) => changeField(id, url)} />)}
    </CmsFieldSection></CmsEditorContent>
    </Form>
    <CmsFooter><Button type="button" variant="ghost" isDisabled={pending || !dirty} onPress={() => { revision.current += 1; reset(saved); setExposed({}); setError(""); setMessage(""); }}>Discard changes</Button></CmsFooter>
  </>;
}

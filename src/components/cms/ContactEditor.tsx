"use client";

import { Link, Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSocial } from "@/src/cms/SocialProvider";
import { emptySocial, sameSocial, validateSocial, type SocialDraft, type SocialErrors, type SocialRecord } from "@/src/cms/social";
import { Button } from "@/src/components/ui/Button";
import { CmsBackButton } from "./CmsBackButton";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsDialog } from "./CmsDialog";
import { CmsField } from "./CmsField";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsDemoControls, CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { CmsUnsavedChangesDialog, useCmsUnsavedChanges } from "./CmsUnsavedChanges";
import { ContactProfileImage } from "./ContactProfileImage";
import { ImagePicker } from "./ImagePicker";
const ContactPreview = dynamic(() => import("./ContactPreview").then((module) => module.ContactPreview), { ssr: false, loading: () => <p role="status">Loading contact preview…</p> });

export function ContactEditor({ id }: { id: string }) {
  const { records } = useSocial();
  const router = useRouter();
  const record = records.find((item) => item.id === id);
  if (id !== "new" && !record) return <CmsShell section="contact">
    <CmsBackButton onPress={() => router.push("/admin/contact")}>Back to Contact</CmsBackButton>
    <CmsPageHeader title="Profile unavailable" description="Demo profiles reset on reload. Return to Contact to start again." />
  </CmsShell>;
  return <ContactEditorForm key={id} initialRecord={record} />;
}
function ContactEditorForm({ initialRecord }: { initialRecord?: SocialRecord }) {
  const router = useRouter();
  const { records, save, remove, pending, failNext, setFailNext } = useSocial();
  const [id] = useState(() => initialRecord?.id ?? `profile-${crypto.randomUUID()}`);
  const record = records.find((item) => item.id === id);
  const [value, setValue] = useState<SocialDraft>(() => initialRecord ?? emptySocial());
  const baseline = record ?? emptySocial();
  const dirty = !sameSocial(value, baseline);
  const [errors, setErrors] = useState<SocialErrors>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  function focusFirstError(nextErrors: SocialErrors) {
    const first = Object.keys(nextErrors)[0];
    if (first) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError(""); setMessage("");
    const nextErrors = validateSocial(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (navigation.dialog.open) setError("Correct the profile fields before saving. Choose Stay to correct them.");
      else focusFirstError(nextErrors);
      return false;
    }
    try { await save(id, value); setMessage("Saved in demo."); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Save failed. Your edits are still here."); return false; }
  }
  async function deleteProfile() {
    if (pending || !record) return;
    setError("");
    try { await remove(id); router.push("/admin/contact"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Delete failed. Your edits are still here."); }
  }
  const navigation = useCmsUnsavedChanges({ dirty, pending, save: saveChanges, navigate: (path) => router.push(path) });
  const leave = navigation.leave;
  if (preview) {
    const working = { ...value, id };
    const profiles = record ? records.map((item) => item.id === id ? working : item) : [...records, working];
    return <CmsPreviewFrame label="Contact preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><ContactPreview records={profiles} /></CmsPreviewFrame>;
  }
  return <CmsShell section="contact" onNavigate={leave}>
    <CmsBackButton disabled={pending} onPress={() => leave("/admin/contact")}>Back to Contact</CmsBackButton>
    <CmsPageHeader title={record ? "Edit contact profile" : "New contact profile"} description="Set the name, destination and image shown beside your contact form." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || (!dirty && Boolean(record))} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>
      <Button id="contact-editor-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("contact-editor-preview-trigger"); setPreview(true); }}>Preview contact</Button>
    </CmsToolbar>
    <CmsFeedback label="Contact save status" error={!deleting && !navigation.dialog.open ? error : undefined}>{pending ? "Saving in demo…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <CmsEditorContent supporting={<CmsFieldSection title="Profile image" description={value.icon ? "The built-in logo is used until you select an image." : "Choose an image for this custom profile."}>
      <ImagePicker name="imageSrc" value={value.imageSrc} alt={`${value.name || "Profile"} image`} error={errors.imageSrc} onChange={(imageSrc) => setValue((current) => ({ ...current, imageSrc }))}><ContactProfileImage src={value.imageSrc} alt={`${value.name || "Profile"} image`} /></ImagePicker>
    </CmsFieldSection>}>
      <CmsFieldSection title="Content">
        <CmsField name="name" label="Name" value={value.name} error={errors.name} onChange={(name) => setValue((current) => ({ ...current, name }))} />
        <CmsField name="url" label="Profile URL" type="url" icon={<Link aria-hidden="true" className="size-4" />} hint="Enter a complete HTTPS destination." value={value.url} error={errors.url} onChange={(url) => setValue((current) => ({ ...current, url }))} />
      </CmsFieldSection>
    </CmsEditorContent>
    <CmsFooter actions={record ? <CmsLifecycleButton action="delete" disabled={pending} onPress={() => { setError(""); setDeleting(true); }}>Delete profile</CmsLifecycleButton> : undefined}>
      <Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(baseline); setErrors({}); setError(""); setMessage(""); }}>Discard changes</Button>
    </CmsFooter>
    <CmsDemoControls><CmsCheckbox value={failNext} disabled={pending} onChange={setFailNext}>Fail next request</CmsCheckbox></CmsDemoControls>
    <CmsUnsavedChangesDialog {...navigation.dialog} error={error} onStay={() => { navigation.dialog.onStay(); focusFirstError(errors); }} />
    <CmsDialog open={deleting} onClose={() => { if (!pending) setDeleting(false); }} title="Delete this profile?" error={error} actions={<>
      <Button variant="ghost" isDisabled={pending} onPress={() => setDeleting(false)}>Cancel</Button>
      <CmsLifecycleButton action="delete" confirmation pending={pending} onPress={() => void deleteProfile()}>Delete in demo</CmsLifecycleButton>
    </>}>Delete {value.name || "Untitled profile"}? This removes the saved profile, image and current edits from the demo. The public contact page is unchanged.</CmsDialog>
  </CmsShell>;
}

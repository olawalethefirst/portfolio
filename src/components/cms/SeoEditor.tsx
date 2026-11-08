"use client";

import { Route, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSeo } from "@/src/cms/SeoProvider";
import { emptySeoOverride, sameSeoRecord, sameSeoValues, validateSeoDefaults, validateSeoRecord, type SeoErrors, type SeoRecord } from "@/src/cms/seo";
import { Button } from "@/src/components/ui/Button";
import { CmsBackButton } from "./CmsBackButton";
import { CmsDialog } from "./CmsDialog";
import { CmsField } from "./CmsField";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader, CmsToolbar } from "./CmsLayout";
import { CmsShell } from "./CmsShell";
import { CmsUnsavedChangesDialog, useCmsUnsavedChanges } from "./CmsUnsavedChanges";
import { SeoFields } from "./SeoFields";

export function SeoEditor({ id }: { id: string }) {
  const { saved } = useSeo();
  const router = useRouter();
  const record = saved.records.find((item) => item.id === id);
  if (id !== "defaults" && id !== "new" && !record) return <CmsShell section="seo">
    <CmsBackButton onPress={() => router.push("/admin/seo")}>Back to SEO</CmsBackButton>
    <CmsPageHeader title="SEO override unavailable" description="Return to SEO to start again." />
  </CmsShell>;
  return <SeoEditorForm key={id} defaultsMode={id === "defaults"} initialRecord={record} />;
}

function SeoEditorForm({ defaultsMode, initialRecord }: { defaultsMode: boolean; initialRecord?: SeoRecord }) {
  const router = useRouter();
  const { saved, saveDefaults, saveRecord, deleteRecord, pending } = useSeo();
  const [id] = useState(() => initialRecord?.id ?? `seo-${crypto.randomUUID()}`);
  const record = saved.records.find((item) => item.id === id);
  const [value, setValue] = useState<SeoRecord>(() => defaultsMode ? { id, path: "", ...saved.defaults } : initialRecord ?? { id, path: "", ...emptySeoOverride() });
  const baseline = defaultsMode ? { id, path: "", ...saved.defaults } : record ?? { id, path: "", ...emptySeoOverride() };
  const dirty = defaultsMode ? !sameSeoValues(value, baseline) : !sameSeoRecord(value, baseline);
  const [errors, setErrors] = useState<SeoErrors>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  function focusFirstError(nextErrors: SeoErrors) {
    const first = Object.keys(nextErrors)[0];
    if (first) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError(""); setMessage("");
    const nextErrors = defaultsMode ? validateSeoDefaults(value) : validateSeoRecord(value, saved.records);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (navigation.dialog.open) setError("Correct the SEO fields before saving. Choose Stay to correct them.");
      else focusFirstError(nextErrors);
      return false;
    }
    try {
      if (defaultsMode) await saveDefaults(value);
      else {
        const submitted = await saveRecord(value);
        // Reflect canonicalization only if the user has not typed a newer path.
        setValue((current) => current.path === value.path ? { ...current, path: submitted.path } : current);
      }
      setMessage("Saved.");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Save failed. Your changes are still here.");
      return false;
    }
  }
  async function remove() {
    if (pending || !record) return;
    setError("");
    try { await deleteRecord(id); router.push("/admin/seo"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Delete failed. Your changes are still here."); }
  }
  const navigation = useCmsUnsavedChanges({ dirty, pending, save: saveChanges, navigate: (path) => router.push(path) });
  const leave = navigation.leave;
  return <CmsShell section="seo" onNavigate={leave}>
    <CmsBackButton disabled={pending} onPress={() => leave("/admin/seo")}>Back to SEO</CmsBackButton>
    <CmsPageHeader title={defaultsMode ? "SEO defaults" : record ? "Edit SEO override" : "New SEO override"} description={defaultsMode ? "Used by paths without a title or description override." : "Override an exact site path. Adding an override does not create a public page."} />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || (!dirty && (defaultsMode || Boolean(record)))} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>{null}</CmsToolbar>
    <CmsFeedback label="SEO save status" error={!deleting && !navigation.dialog.open ? error : undefined}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <CmsEditorContent><CmsFieldSection title="Content" description={defaultsMode ? "Both defaults are required." : "Provide at least one override. A blank individual field inherits its default."}>
      {!defaultsMode ? <CmsField name="path" label="Path" value={value.path} error={errors.path} icon={<Route aria-hidden="true" className="size-4" />} hint="An exact site path such as /contact. Trailing slashes are normalized on save." onChange={(path) => setValue((current) => ({ ...current, path }))} /> : null}
      <SeoFields value={value} defaults={defaultsMode ? undefined : saved.defaults} errors={errors} onChange={(next) => setValue((current) => ({ ...current, ...next }))} />
    </CmsFieldSection></CmsEditorContent>
    <CmsFooter actions={!defaultsMode && record ? <CmsLifecycleButton action="delete" disabled={pending} onPress={() => { setError(""); setDeleting(true); }}>Delete override</CmsLifecycleButton> : undefined}>
      <Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(baseline); setErrors({}); setError(""); setMessage(""); }}>Discard changes</Button>
    </CmsFooter>
    <CmsUnsavedChangesDialog {...navigation.dialog} error={error} onStay={() => { navigation.dialog.onStay(); focusFirstError(errors); }} />
    <CmsDialog open={deleting} onClose={() => { if (!pending) setDeleting(false); }} title="Delete this override?" error={error} actions={<>
      <Button variant="ghost" isDisabled={pending} onPress={() => setDeleting(false)}>Cancel</Button>
      <CmsLifecycleButton action="delete" confirmation pending={pending} onPress={() => void remove()}>Delete</CmsLifecycleButton>
    </>}>Remove the override for {record?.path}? This removes its saved values and current edits. Global defaults will apply. The public page is not deleted.</CmsDialog>
  </CmsShell>;
}

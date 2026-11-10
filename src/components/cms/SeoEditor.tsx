"use client";

import { Route, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Form } from "@heroui/react";
import { useId, useRef, useState } from "react";
import { useSeo } from "@/src/cms/SeoProvider";
import { emptySeoOverride, sameSeoRecord, sameSeoValues, validateSeoDefaults, validateSeoRecord, type SeoErrors, type SeoRecord } from "@/src/cms/seo";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";
import { CmsField } from "./CmsField";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsEditorContent, CmsFeedback, CmsFieldSection, CmsFooter, CmsPageHeader } from "./CmsLayout";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import { useWorkingDraft } from "@/src/cms/working-drafts";
import { SeoFields } from "./SeoFields";

export function SeoEditor({ id }: { id: string }) {
  const { saved } = useSeo();
  const router = useRouter();
  const record = saved.records.find((item) => item.id === id);
  if (id !== "defaults" && id !== "new" && !record) return <>
    <CmsPageHeader onBack={() => router.push("/admin/seo")} backLabel="Back to SEO" title="SEO override unavailable" description="Return to SEO to start again." />
  </>;
  return <SeoEditorForm key={id} defaultsMode={id === "defaults"} initialRecord={record} />;
}

function SeoEditorForm({ defaultsMode, initialRecord }: { defaultsMode: boolean; initialRecord?: SeoRecord }) {
  const router = useRouter();
  const { saved, saveDefaults, saveRecord, deleteRecord, pending, working } = useSeo();
  const { id, value, setValue, reset, ready, persistenceStatus } = useWorkingDraft(working, defaultsMode ? "defaults" : initialRecord?.id ?? "new", () => defaultsMode ? { id: "defaults", path: "", ...saved.defaults } : initialRecord ?? { id: "", path: "", ...emptySeoOverride() }, initialRecord?.id ?? (defaultsMode ? "defaults" : undefined));
  const record = saved.records.find((item) => item.id === id);
  const baseline = defaultsMode ? { id, path: "", ...saved.defaults } : record ?? { id, path: "", ...emptySeoOverride() };
  const dirty = defaultsMode ? !sameSeoValues(value, baseline) : !sameSeoRecord(value, baseline);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const revision = useRef(0);
  const [exposed, setExposed] = useState<Partial<Record<keyof SeoErrors, boolean>>>({});
  const currentErrors = defaultsMode ? validateSeoDefaults(value) : validateSeoRecord({ ...value, id }, saved.records);
  const errors: SeoErrors = {};
  for (const field of ["path", "title", "description"] as const) {
    if (exposed[field]) errors[field] = currentErrors[field];
  }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  function changeFields(patch: Partial<SeoRecord>) {
    revision.current += 1;
    setError("");
    setMessage("");
    setValue((current) => ({ ...current, ...patch }));
  }
  function expose(field: keyof SeoErrors) {
    // Overrides share a single title-targeted completeness error.
    setExposed((current) => ({ ...current, [field]: true,
      ...(!defaultsMode && field !== "path" ? { title: true } : {}),
    }));
  }

  function focusFirstError(nextErrors: SeoErrors) {
    const order = defaultsMode ? ["title", "description"] as const : ["path", "title", "description"] as const;
    const first = order.find((field) => nextErrors[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError(""); setMessage("");
    const nextErrors = defaultsMode ? validateSeoDefaults(value) : validateSeoRecord({ ...value, id }, saved.records);
    setExposed(defaultsMode ? { title: true, description: true } : { path: true, title: true, description: true });
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return false;
    }
    const submittedRevision = revision.current;
    try {
      if (defaultsMode) await saveDefaults(value);
      else {
        const submitted = await saveRecord({ ...value, id });
        // Reflect canonicalization only if the user has not typed a newer path.
        setValue((current) => current.path === value.path ? { ...current, path: submitted.path } : current);
      }
      if (revision.current === submittedRevision) setMessage("Saved.");
      return true;
    } catch (failure) {
      if (revision.current === submittedRevision) setError(failure instanceof Error ? failure.message : "Save failed. Your changes are still here.");
      return false;
    }
  }
  async function remove() {
    if (pending || !record) return;
    setError("");
    try { await deleteRecord(id); router.push("/admin/seo"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Delete failed. Your changes are still here."); }
  }
  if (!ready) return <p role="status">Restoring local draft…</p>;
  return <>
    <CmsPageHeader onBack={() => router.push("/admin/seo")} backLabel="Back to SEO" backDisabled={pending} title={defaultsMode ? "SEO defaults" : record ? "Edit SEO override" : "New SEO override"} description={defaultsMode ? "Used by paths without a title or description override." : "Override an exact site path. Adding an override does not create a public page."} action={<Button type="submit" form={formId} variant="outline" isDisabled={pending || (!dirty && (defaultsMode || Boolean(record)))} startContent={<Save aria-hidden="true" className="size-4" />}>Save changes</Button>} />
    <CmsDraftFeedback status={persistenceStatus} />
    <CmsFeedback label="SEO save status" error={!deleting ? error : undefined}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}{message ? ` ${message}` : ""}</CmsFeedback>
    <Form id={formId} ref={formRef} className="block" validationBehavior="aria" onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
    <CmsEditorContent><CmsFieldSection title="Content" description={defaultsMode ? "Both defaults are required." : "Provide at least one override. A blank individual field inherits its default."}>
      {!defaultsMode ? <CmsField name="path" label="Path" value={value.path} error={errors.path} icon={<Route aria-hidden="true" className="size-4" />} hint="An exact site path such as /contact. Trailing slashes are normalized on save." onBlur={() => expose("path")} onChange={(path) => changeFields({ path })} /> : null}
      <SeoFields value={value} defaults={defaultsMode ? undefined : saved.defaults} errors={errors} onBlur={expose} onChange={changeFields} />
    </CmsFieldSection></CmsEditorContent>
    </Form>
    <CmsFooter actions={!defaultsMode && record ? <CmsLifecycleButton action="delete" disabled={pending} onPress={() => { setError(""); setDeleting(true); }}>Delete override</CmsLifecycleButton> : undefined}>
      <Button type="button" variant="ghost" isDisabled={pending || (!dirty && !Object.keys(exposed).length && !error && !message)} onPress={() => { revision.current += 1; reset(baseline); setExposed({}); setError(""); setMessage(""); }}>Discard changes</Button>
    </CmsFooter>
    <CmsDialog open={deleting} onClose={() => { if (!pending) setDeleting(false); }} title="Delete this override?" error={error} actions={<>
      <Button type="button" variant="ghost" isDisabled={pending} onPress={() => setDeleting(false)}>Cancel</Button>
      <CmsLifecycleButton action="delete" confirmation pending={pending} onPress={() => void remove()}>Delete</CmsLifecycleButton>
    </>}>Remove the override for {record?.path}? This removes its saved values and current edits. Global defaults will apply. The public page is not deleted.</CmsDialog>
  </>;
}

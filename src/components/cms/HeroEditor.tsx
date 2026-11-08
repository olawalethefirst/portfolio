"use client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Maximize2, Save } from "lucide-react";
import { useState } from "react";
import { useHero } from "@/src/cms/HeroProvider";
import { sameHero, type HeroDraft } from "@/src/cms/hero";
import { Button } from "@/src/components/ui/Button";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsUnsavedChangesDialog, useCmsUnsavedChanges } from "./CmsUnsavedChanges";
import { CmsField } from "./CmsField";
import { CmsEditorContent, CmsFieldSection, CmsFeedback, CmsPageHeader, CmsToolbar, CmsFooter, CmsDemoControls } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
const HeroPreview = dynamic(() => import("./HeroPreview").then((m) => m.HeroPreview), { ssr: false, loading: () => <p role="status">Loading hero preview…</p> });
const stages = [["idea", "Idea"], ["iterate", "Iterate"], ["solution", "Solution"]] as const;
export function HeroEditor() {
  const router = useRouter();
  const { value: saved, save, pending, failNext, setFailNext } = useHero();
  const [value, setValue] = useState(saved);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const [error, setError] = useState("");
  const dirty = !sameHero(value, saved);
  async function saveChanges() {
    if (pending) return false;
    setError("");
    try {
      await save(value);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Save failed.");
      return false;
    }
  }
  const navigation = useCmsUnsavedChanges({ dirty, pending, save: saveChanges, navigate: (path) => router.push(path) });
  const leave = navigation.leave;
  const update = (patch: Partial<HeroDraft>) => setValue((current) => ({ ...current, ...patch }));
  if (preview) return <CmsPreviewFrame label="Hero preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><HeroPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="hero" onHero={() => leave("/admin/hero")} onPublications={() => leave("/admin/publications")} onProjects={() => leave("/admin/projects")}>
    <CmsPageHeader title="Hero" description="Edit the introduction and the copy shown for each fixed stage." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void saveChanges()}>Save changes</Button>}>
      <Button id="hero-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("hero-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="Hero save status" error={navigation.dialog.open ? undefined : error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}</CmsFeedback>
    <CmsEditorContent><CmsFieldSection title="Content">
      <CmsField name="eyebrow" label="Eyebrow" value={value.eyebrow} onChange={(eyebrow) => update({ eyebrow })} />
      <CmsField name="headline" label="Headline" value={value.headline} onChange={(headline) => update({ headline })} />
      <div className="mt-8 space-y-8">{stages.map(([key, label]) => <CmsFieldSection key={key} title={label} level={3} separated>
        <CmsField name={key + "-tagline"} label="Tagline" value={value.stages[key].tagline} onChange={(tagline) => setValue((current) => ({ ...current, stages: { ...current.stages, [key]: { ...current.stages[key], tagline } } }))} />
        <CmsField name={key + "-description"} label="Description" multiline="short" value={value.stages[key].description} onChange={(description) => setValue((current) => ({ ...current, stages: { ...current.stages, [key]: { ...current.stages[key], description } } }))} />
      </CmsFieldSection>)}</div>
    </CmsFieldSection></CmsEditorContent>
    <CmsFooter><Button variant="ghost" isDisabled={pending || !dirty} onPress={() => { setValue(saved); setError(""); }}>Discard changes</Button></CmsFooter>
    <CmsDemoControls><CmsCheckbox value={failNext} disabled={pending} onChange={setFailNext}>Fail next save</CmsCheckbox></CmsDemoControls>
    <CmsUnsavedChangesDialog {...navigation.dialog} error={error} />
  </CmsShell>;
}

"use client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Maximize2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useHero } from "@/src/cms/HeroProvider";
import { sameHero, type HeroDraft } from "@/src/cms/hero";
import { Button } from "@/src/components/ui/Button";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsDialog } from "./CmsDialog";
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
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function leave(path: string) {
    if (pending) return;
    if (dirty) setDestination(path); else router.push(path);
  }
  const update = (patch: Partial<HeroDraft>) => setValue((current) => ({ ...current, ...patch }));
  if (preview) return <CmsPreviewFrame label="Hero preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><HeroPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="hero" onPublications={() => leave("/admin/publications")} onProjects={() => leave("/admin/projects")}>
    <CmsPageHeader title="Hero" description="Edit the introduction and the copy shown for each fixed stage." />
    <CmsToolbar actions={<Button variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />} onPress={async () => { setError(""); try { await save(value); } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); } }}>Save changes</Button>}>
      <Button id="hero-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("hero-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="Hero save status" error={error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}</CmsFeedback>
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
    <CmsDialog open={destination !== null} onClose={() => setDestination(null)} title="Keep your changes?" actions={<>
      <Button variant="ghost" onPress={() => setDestination(null)}>Stay</Button>
      <Button variant="outline" onPress={() => { if (destination) router.push(destination); }}>Discard and leave</Button>
    </>}>You have unsaved Hero changes. Stay to save them, or discard them and leave.</CmsDialog>
  </CmsShell>;
}

"use client";
import dynamic from "next/dynamic";
import { Maximize2, Save } from "lucide-react";
import { Form } from "@heroui/react";
import { useId, useRef, useState } from "react";
import { useHero } from "@/src/cms/HeroProvider";
import { sameHero, validateHero, type HeroDraft, type HeroErrors, type HeroField } from "@/src/cms/hero";
import { Button } from "@/src/components/ui/Button";
import { useWorkingDraft } from "@/src/cms/working-drafts";
import { CmsField } from "./CmsField";
import { CmsEditorContent, CmsFieldSection, CmsFeedback, CmsPageHeader, CmsToolbar, CmsFooter } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
const HeroPreview = dynamic(() => import("./HeroPreview").then((m) => m.HeroPreview), { ssr: false, loading: () => <p role="status">Loading hero preview…</p> });
const stages = [["idea", "Idea"], ["iterate", "Iterate"], ["solution", "Solution"]] as const;
export function HeroEditor() {
  const { saved, save, pending, working } = useHero();
  const { value, setValue } = useWorkingDraft(working, "hero", () => saved);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const [error, setError] = useState("");
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const revision = useRef(0);
  const [exposed, setExposed] = useState<Partial<Record<HeroField, boolean>>>({});
  const currentErrors = validateHero(value);
  const errors: HeroErrors = {};
  for (const field of Object.keys(currentErrors) as HeroField[]) {
    if (exposed[field]) errors[field] = currentErrors[field];
  }
  const expose = (field: HeroField) => setExposed((current) => ({ ...current, [field]: true }));
  function edit(next: (current: HeroDraft) => HeroDraft) {
    revision.current += 1;
    setError("");
    setValue(next);
  }
  const dirty = !sameHero(value, saved);
  function focusFirstError(nextErrors: HeroErrors) {
    const order: HeroField[] = ["eyebrow", "headline", ...stages.flatMap(([key]) => [`${key}-tagline`, `${key}-description`] as const)];
    const first = order.find((field) => nextErrors[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }
  async function saveChanges() {
    if (pending) return false;
    setError("");
    const nextErrors = validateHero(value);
    setExposed(Object.fromEntries(Object.keys(nextErrors).map((field) => [field, true])));
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return false;
    }
    const submittedRevision = revision.current;
    try {
      await save(value);
      return true;
    } catch (failure) {
      if (revision.current === submittedRevision) setError(failure instanceof Error ? failure.message : "Save failed.");
      return false;
    }
  }
  const update = (patch: Partial<HeroDraft>) => edit((current) => ({ ...current, ...patch }));
  if (preview) return <CmsPreviewFrame label="Hero preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><HeroPreview value={value} /></CmsPreviewFrame>;
  return <>
    <CmsPageHeader title="Hero" description="Edit the introduction and the copy shown for each fixed stage." />
    <CmsToolbar actions={<Button type="submit" form={formId} variant="outline" isDisabled={pending || !dirty} startContent={<Save aria-hidden="true" className="size-4" />}>Save changes</Button>}>
      <Button type="button" id="hero-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("hero-preview-trigger"); setPreview(true); }}>Preview</Button>
    </CmsToolbar>
    <CmsFeedback label="Hero save status" error={error}>{pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}</CmsFeedback>
    <Form id={formId} ref={formRef} className="block" validationBehavior="aria" onSubmit={(event) => { event.preventDefault(); void saveChanges(); }}>
    <CmsEditorContent><CmsFieldSection title="Content">
      <CmsField name="eyebrow" onBlur={() => expose("eyebrow")} label="Eyebrow" error={errors.eyebrow} value={value.eyebrow} onChange={(eyebrow) => update({ eyebrow })} />
      <CmsField name="headline" onBlur={() => expose("headline")} label="Headline" error={errors.headline} value={value.headline} onChange={(headline) => update({ headline })} />
      <div className="mt-8 space-y-8">{stages.map(([key, label]) => <CmsFieldSection key={key} title={label} level={3} separated>
        <CmsField name={key + "-tagline"} onBlur={() => expose(`${key}-tagline`)} label="Tagline" error={errors[`${key}-tagline`]} value={value.stages[key].tagline} onChange={(tagline) => edit((current) => ({ ...current, stages: { ...current.stages, [key]: { ...current.stages[key], tagline } } }))} />
        <CmsField name={key + "-description"} onBlur={() => expose(`${key}-description`)} label="Description" error={errors[`${key}-description`]} multiline="short" value={value.stages[key].description} onChange={(description) => edit((current) => ({ ...current, stages: { ...current.stages, [key]: { ...current.stages[key], description } } }))} />
      </CmsFieldSection>)}</div>
    </CmsFieldSection></CmsEditorContent>
    </Form>
    <CmsFooter><Button type="button" variant="ghost" isDisabled={pending || !dirty} onPress={() => { revision.current += 1; setValue(saved); setError(""); setExposed({}); }}>Discard changes</Button></CmsFooter>
  </>;
}

"use client";
import { CmsRadioGroup } from "./CmsRadioGroup";
import { Link } from "lucide-react";
import type { ProjectDraft, ProjectErrors } from "@/src/cms/projects";
import { CmsEditorContent, CmsFieldSection } from "./CmsLayout";
import { CmsField } from "./CmsField";
import { ImagePicker } from "./ImagePicker";

const platforms = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
] as const;

export function ProjectFields({ value, errors, onChange, onBlur, imageReset, onImageSelect }: { value: ProjectDraft; errors: ProjectErrors; onChange: (value: ProjectDraft) => void; onBlur?: (field: keyof ProjectDraft) => void; imageReset?: number; onImageSelect?: () => void }) {
  function field<K extends keyof ProjectDraft>(key: K, next: ProjectDraft[K]) { onChange({ ...value, [key]: next }); }
  const supporting = <CmsFieldSection title="Screenshot">
      <ImagePicker key={imageReset} onSelect={onImageSelect} onBlur={() => onBlur?.("screenshot")} name="screenshot" value={value.screenshot} alt={value.screenshotAlt} onChange={(source) => field("screenshot", source)} error={errors.screenshot} />
      <CmsField name="screenshotAlt" onBlur={() => onBlur?.("screenshotAlt")} label="Image description" value={value.screenshotAlt} onChange={(next) => field("screenshotAlt", next)} error={errors.screenshotAlt} />
    </CmsFieldSection>;
  return <CmsEditorContent supporting={supporting}>
    <CmsFieldSection title="Content">
      <CmsField name="name" onBlur={() => onBlur?.("name")} label="Name" value={value.name} onChange={(next) => field("name", next)} error={errors.name} />
      {([['summary', 'Summary'], ['what', 'What'], ['how', 'How']] as const).map(([key, label]) => <CmsField key={key} name={key} onBlur={() => onBlur?.(key)} label={label} value={value[key]} onChange={(next) => field(key, next)} multiline="short" error={errors[key]} />)}
      <CmsRadioGroup name="platform" label="Platform" value={value.platform}
        options={platforms} onChange={(next) => field("platform", next)} />
      <CmsField name="liveUrl" onBlur={() => onBlur?.("liveUrl")} label="Live URL" type="url" icon={<Link />} value={value.liveUrl} onChange={(next) => field("liveUrl", next)} error={errors.liveUrl} hint="A complete HTTPS destination for the project." />
    </CmsFieldSection>
  </CmsEditorContent>;
}

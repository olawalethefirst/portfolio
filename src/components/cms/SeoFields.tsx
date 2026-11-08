"use client";

import { resolveSeo, type SeoErrors, type SeoValues } from "@/src/cms/seo";
import { CmsField } from "./CmsField";

export function SeoFields({ value, defaults, onChange, errors }: {
  value: SeoValues;
  defaults?: SeoValues;
  onChange: (value: SeoValues) => void;
  errors: SeoErrors;
}) {
  const effective = resolveSeo(defaults ?? value, defaults ? value : { title: "", description: "" });
  return <>
    <CmsField name="title" label={defaults ? "SEO title override" : "Default title"} value={value.title} error={errors.title} onChange={(title) => onChange({ ...value, title })} />
    <CmsField name="description" label={defaults ? "SEO description override" : "Default description"} multiline="short" value={value.description} error={errors.description} onChange={(description) => onChange({ ...value, description })} />
    <section aria-label={defaults ? "SEO effective metadata" : "Default effective metadata"} className="space-y-3 border border-border p-4 text-sm [overflow-wrap:anywhere]">
      <h3 className="font-medium">Effective metadata</h3>
      <dl className="space-y-3">
        <div><dt className="text-muted">Title</dt><dd>{effective.title || "Not set"}</dd><dd className="text-xs text-muted">{effective.titleSource}</dd></div>
        <div><dt className="text-muted">Description</dt><dd className="whitespace-pre-wrap">{effective.description || "Not set"}</dd><dd className="text-xs text-muted">{effective.descriptionSource}</dd></div>
      </dl>
    </section>
    <p className="text-sm text-muted">Search engines may display different text.</p>
  </>;
}

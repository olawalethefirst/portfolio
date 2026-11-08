"use client";

import { CmsRadioGroup } from "./CmsRadioGroup";
import { CmsCheckbox } from "./CmsCheckbox";
import { ImagePicker } from "./ImagePicker";
import { Link, Tags } from "lucide-react";
import {
  publicationTags,
  type PublicationDraft,
  type PublicationErrors,
} from "@/src/cms/publications";
import { useCms } from "@/src/cms/CmsProvider";
import { Button } from "@/src/components/ui/Button";
import { CmsEditorContent, CmsFieldSection } from "./CmsLayout";
import { CmsField } from "./CmsField";

const publicationKinds = [
  { value: "local", label: "Local article" },
  { value: "external", label: "External link" },
] as const;

export function PublicationFields({
  value,
  errors,
  onChange,
}: {
  value: PublicationDraft;
  errors: PublicationErrors;
  onChange: (value: PublicationDraft) => void;
}) {
  const { records } = useCms();
  const selectedTags = publicationTags(value.tagsText).map((tag) =>
    tag.toLowerCase(),
  );
  const suggestions = publicationTags(
    records.map((record) => record.draft.tagsText).join(","),
  ).filter((tag) => !selectedTags.includes(tag.toLowerCase()));
  function field<K extends keyof PublicationDraft>(
    key: K,
    next: PublicationDraft[K],
  ) {
    onChange({ ...value, [key]: next });
  }
  const supporting = <>
        <CmsFieldSection title="Cover">
          <ImagePicker
            value={value.coverSrc}
            alt={value.decorativeCover ? "" : value.coverAlt}
            onChange={(source) => field("coverSrc", source)}
            error={errors.coverSrc}
          />
          <CmsCheckbox value={value.decorativeCover} onChange={(next) => field("decorativeCover", next)}>Decorative image</CmsCheckbox>
          {!value.decorativeCover ? (
            <CmsField
              name="coverAlt"
              label="Image description"
              value={value.coverAlt}
              onChange={(next) => field("coverAlt", next)}
              hint="Describe the image for readers who cannot see it."
              error={errors.coverAlt}
            />
          ) : null}
        </CmsFieldSection>
        <CmsFieldSection title="Publishing" separated>
          <CmsField
            name="publishedOn"
            label="Publication date"
            value={value.publishedOn}
            onChange={(next) => field("publishedOn", next)}
            type="date"
            hint="The date shown to readers. Dates use UTC."
            error={errors.publishedOn}
          />
          <p className="text-xs leading-5 text-muted">
            Save a draft whenever you like.
          </p>
        </CmsFieldSection>
      </>;
  return (
    <CmsEditorContent supporting={supporting}>
      <CmsFieldSection title="Content" description="Give your idea a title, then make it your own.">
        <CmsField
          name="title"
          label="Title"
          value={value.title}
          onChange={(next) => field("title", next)}
          error={errors.title}
        />
        <CmsField
          name="summary"
          label="Summary"
          value={value.summary}
          onChange={(next) => field("summary", next)}
          multiline="short"
          hint="The introduction readers see on your publication card."
          error={errors.summary}
        />
        <CmsRadioGroup name="publication-kind" label="Publication type" value={value.kind}
          options={publicationKinds} onChange={(next) => field("kind", next)} />
        {value.kind === "local" ? (
          <CmsField
            name="bodyMarkdown"
            label="Article"
            value={value.bodyMarkdown}
            onChange={(next) => field("bodyMarkdown", next)}
            multiline="article"
            hint="Write in Markdown. Headings, links, images, tables and code are supported. Use Preview to see the finished article."
            error={errors.bodyMarkdown}
          />
        ) : (
          <CmsField
            name="externalUrl"
            label="Publication URL"
            value={value.externalUrl}
            onChange={(next) => field("externalUrl", next)}
            type="url"
            icon={<Link />}
            hint="A complete HTTPS link to the published story."
            error={errors.externalUrl}
          />
        )}
        <CmsField
          name="tagsText"
          label="Tags"
          value={value.tagsText}
          onChange={(next) => field("tagsText", next)}
          hint="Separate topics with commas. Repeated tags appear only once in selections and preview."
          icon={<Tags />}
        />
        {selectedTags.length ? (
          <div className="flex flex-wrap gap-2" aria-label="Selected topics">
            {publicationTags(value.tagsText).map((tag) => (
              <Button key={tag.toLowerCase()} variant="ghost" size="sm"
                aria-label={`Remove tag ${tag}`}
                onPress={() => field("tagsText", publicationTags(value.tagsText)
                  .filter((selected) => selected.toLowerCase() !== tag.toLowerCase()).join(", "))}>
                {tag} · Remove
              </Button>
            ))}
          </div>
        ) : null}
        {suggestions.length ? (
          <div>
            <p className="mb-2 text-xs text-muted">Existing topics</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  aria-label={`Add tag ${tag}`}
                  onPress={() =>
                    field(
                      "tagsText",
                      [...publicationTags(value.tagsText), tag].join(", "),
                    )
                  }
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CmsFieldSection>
    </CmsEditorContent>
  );
}

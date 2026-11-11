"use client";

import { ImagePicker } from "./ImagePicker";
import { Tags } from "lucide-react";
import {
  publicationTags,
  type PublicationDraft,
  type PublicationErrors,
} from "@/src/cms/publications";
import { useCms } from "@/src/cms/CmsProvider";
import { Button } from "@/src/components/ui/Button";
import { CmsEditorContent, CmsFieldSection } from "./CmsLayout";
import { CmsField } from "./CmsField";
import { PublicationArticleTrigger } from "./PublicationArticleTrigger";

export function PublicationFields({
  value,
  errors,
  onChange,
  onBlur,
  imageReset,
  onImageSelect,
  onWriteArticle,
  articleDirty,
}: {
  value: PublicationDraft;
  errors: PublicationErrors;
  onChange: (value: PublicationDraft) => void;
  onBlur?: (field: keyof PublicationDraft) => void;
  imageReset?: number;
  onImageSelect?: () => void;
  onWriteArticle: () => void;
  articleDirty: boolean;
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
            key={imageReset}
            onSelect={onImageSelect}
            onBlur={() => onBlur?.("coverSrc")}
            value={value.coverSrc}
            alt={value.coverAlt}
            onChange={(source) => field("coverSrc", source)}
            error={errors.coverSrc}
          />
          <CmsField
            name="coverAlt"
            onBlur={() => onBlur?.("coverAlt")}
            label="Image description"
            value={value.coverAlt}
            onChange={(next) => field("coverAlt", next)}
            hint="Describe the image for readers who cannot see it."
            error={errors.coverAlt}
          />
        </CmsFieldSection>
        <CmsFieldSection title="Publishing" separated>
          <CmsField
            name="publishedOn"
            onBlur={() => onBlur?.("publishedOn")}
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
          onBlur={() => onBlur?.("title")}
          label="Title"
          value={value.title}
          onChange={(next) => field("title", next)}
          error={errors.title}
        />
        <CmsField
          name="summary"
          onBlur={() => onBlur?.("summary")}
          label="Summary"
          value={value.summary}
          onChange={(next) => field("summary", next)}
          multiline="short"
          hint="The introduction readers see on your publication card."
          error={errors.summary}
        />
        <PublicationArticleTrigger value={value.bodyMarkdown} dirty={articleDirty} error={errors.bodyMarkdown} onOpen={onWriteArticle} />
        <CmsField
          name="tagsText"
          error={errors.tagsText}
          onBlur={() => onBlur?.("tagsText")}
          label="Tags"
          value={value.tagsText}
          onChange={(next) => field("tagsText", next)}
          hint="Separate topics with commas. Repeated tags appear only once in selections and preview."
          icon={<Tags />}
        />
        {selectedTags.length ? (
          <div className="flex flex-wrap gap-2" aria-label="Selected topics">
            {publicationTags(value.tagsText).map((tag) => (
              <Button type="button" key={tag.toLowerCase()} variant="ghost" size="sm"
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
                  type="button"
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

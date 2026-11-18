"use client";

import {
  publicationTags,
  readingTimeMinutes,
  validDate,
  type PublicationDraft,
} from "@/src/cms/publications";
import { PublicationCard } from "@/src/components/publication-card";
import { PublicationDetails } from "@/src/components/publication-details";
import { SectionContainer } from "@/src/components/ui/SectionContainer";

export function PublicationPreview({
  id,
  value,
  mode,
}: {
  id?: string;
  value: PublicationDraft;
  mode: "card" | "detail";
}) {
  const title = value.title.trim() || "Untitled publication";
  const cover = {
    src: value.coverSrc || "/publication-cover.svg",
    alt: value.coverAlt,
  };
  const date = validDate(value.publishedOn) ? value.publishedOn : "2026-09-18";
  const tags = publicationTags(value.tagsText);
  const placeholders =
    !value.title.trim() ||
    !value.summary.trim() ||
    !value.coverSrc ||
    !validDate(value.publishedOn) ||
    !value.bodyMarkdown.trim();

  return (
    <>
      {placeholders ? (
        <div className="border-b border-border bg-surface-secondary">
          <SectionContainer>
            <p role="status" className="py-3 text-sm text-muted">
              Preview placeholders fill missing content, including the sample
              date and cover. They are not saved.
            </p>
          </SectionContainer>
        </div>
      ) : null}
      {mode === "detail" ? (
        <PublicationDetails
          publication={{
            title,
            cover,
            publishedAt: date,
            tags,
            bodyMarkdown:
              value.bodyMarkdown.trim() || "Your article will appear here.",
            readingTimeMinutes: readingTimeMinutes(value.bodyMarkdown),
          }}
        />
      ) : (
        <SectionContainer className="py-14">
          <div className="mx-auto max-w-3xl">
            <PublicationCard
              title={title}
              summary={
                value.summary.trim() ||
                "Your publication summary will appear here."
              }
              date={date}
              cover={cover}
              tags={tags}
              href={id ? `/publications/${id}` : "/"}
            />
          </div>
        </SectionContainer>
      )}
    </>
  );
}

"use client";

import {
  publicationTags,
  validDate,
  type PublicationDraft,
} from "@/src/cms/publications";
import { PublicationCard } from "@/src/components/publication-card";
import { PublicationDetails } from "@/src/components/publication-details";

export function PublicationPreview({
  value,
  mode,
}: {
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
          <p
            role="status"
            className="border-b border-border bg-surface-secondary px-5 py-3 text-sm text-muted"
          >
            Preview placeholders fill missing content, including the sample date
            and cover. They are not saved.
          </p>
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
              readingTimeMinutes: Math.max(
                1,
                Math.ceil(
                  value.bodyMarkdown.trim().split(/\s+/).filter(Boolean)
                    .length / 200,
                ),
              ),
            }}
          />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 py-6">
            <div className="px-5 py-8 sm:px-8">
            <PublicationCard
              title={title}
              summary={
                value.summary.trim() ||
                "Your publication summary will appear here."
              }
              date={date}
              cover={cover}
              tags={tags}
              href="/publication-details-lab"
            />
            </div>
          </div>
        )}
    </>
  );
}

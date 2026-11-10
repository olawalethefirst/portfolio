"use client";

import {
  httpsUrl,
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
    (value.kind === "local" && !value.bodyMarkdown.trim());

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
        {mode === "detail" && value.kind === "local" ? (
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
        ) : mode === "detail" ? (
          <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
            <p className="text-xs font-medium uppercase tracking-widest text-muted">External publication</p>
            <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
            <p className="mt-4 text-muted">Readers follow this publication to its original article.</p>
            {httpsUrl(value.externalUrl) ? <a className="mt-4 block break-all underline" href={value.externalUrl}>{value.externalUrl}</a> : <p className="mt-4">Add a publication URL in the editor.</p>}
          </div>
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
              href={
                value.kind === "local"
                  ? "/publication-details-lab"
                  : httpsUrl(value.externalUrl)
                    ? value.externalUrl
                    : "#external-destination"
              }
            />
            </div>
          </div>
        )}
    </>
  );
}

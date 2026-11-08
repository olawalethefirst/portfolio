"use client";

import { publicationTags, validDate, type PublicationRecord } from "@/src/cms/publications";
import { PublicationsSection } from "@/src/components/home-sections/PublicationsSection";
import { CmsEmptyState } from "./CmsLayout";

export function PublicationCollectionPreview({ records }: { records: readonly PublicationRecord[] }) {
  const publications = records.flatMap(({ id, published }) => published ? [{
    id,
    title: published.title,
    summary: published.summary,
    date: validDate(published.publishedOn) ? published.publishedOn : "2026-09-18",
    cover: { src: published.coverSrc || "/publication-cover.svg", alt: published.decorativeCover ? "" : published.coverAlt },
    tags: publicationTags(published.tagsText),
    href: published.kind === "local" ? "/publication-details-lab" : published.externalUrl,
  }] : []);
  return <PublicationsSection publications={publications} layout="standalone" emptyState={<CmsEmptyState title="No published publications" description="Publish a publication to preview it in this section." />} />;
}

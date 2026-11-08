"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { publicationTags, validDate, type PublicationDraft, type PublicationRecord } from "@/src/cms/publications";
import { PublicationsSection } from "@/src/components/home-sections/PublicationsSection";
import { CmsEmptyState } from "./CmsLayout";
import { CmsPreviewLinks } from "./CmsPreviewLinks";
import { PublicationPreview } from "./PublicationPreview";

export function PublicationCollectionPreview({ records }: { records: readonly PublicationRecord[] }) {
  const [article, setArticle] = useState<PublicationDraft | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!article) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    articleRef.current?.focus({ preventScroll: true });
  }, [article]);
  if (article) return <div ref={articleRef} tabIndex={-1} aria-label="Published article preview"><PublicationPreview value={article} mode="detail" /></div>;
  const publications = records.flatMap(({ id, published }) => published ? [{
    id,
    title: published.title,
    summary: published.summary,
    date: validDate(published.publishedOn) ? published.publishedOn : "2026-09-18",
    cover: { src: published.coverSrc || "/publication-cover.svg", alt: published.decorativeCover ? "" : published.coverAlt },
    tags: publicationTags(published.tagsText),
    href: published.kind === "local" ? `#cms-publication-${id}` : published.externalUrl,
  }] : []);
  return <CmsPreviewLinks onLocalLink={(href) => {
    const selected = records.find(({ id, published }) => published?.kind === "local" && href === `#cms-publication-${id}`)?.published;
    if (!selected) return false;
    setArticle(selected);
    return true;
  }}>
    <PublicationsSection publications={publications} layout="standalone" emptyState={<CmsEmptyState title="No demo-published publications" description="Publish a publication in the demo to preview it in this section." />} />
  </CmsPreviewLinks>;
}

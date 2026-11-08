"use client";

import { ArrowUpRight } from "lucide-react";
import { useState, type MouseEvent } from "react";
import {
  httpsUrl,
  publicationTags,
  validDate,
  type PublicationDraft,
} from "@/src/cms/publications";
import { PublicationCard } from "@/src/components/publication-card";
import { PublicationDetails } from "@/src/components/publication-details";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";

export function PublicationPreview({
  value,
  mode,
}: {
  value: PublicationDraft;
  mode: "card" | "detail";
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const title = value.title.trim() || "Untitled publication";
  const cover = {
    src: value.coverSrc || "/publication-cover.svg",
    alt: value.decorativeCover ? "" : value.coverAlt,
  };
  const date = validDate(value.publishedOn) ? value.publishedOn : "2026-09-18";
  const tags = publicationTags(value.tagsText);
  const placeholders =
    !value.title.trim() ||
    !value.summary.trim() ||
    !value.coverSrc ||
    !validDate(value.publishedOn) ||
    (value.kind === "local" && !value.bodyMarkdown.trim());

  function interceptLink(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest("a");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) {
      event.preventDefault();
      return;
    }
    if (href === "#cms-article-preview") {
      event.preventDefault();
      return;
    }
    if (href.startsWith("#")) return;
    event.preventDefault();
    setLinkError("");
    try {
      const url = new URL(href, window.location.href);
      if (url.protocol === "https:" || url.protocol === "http:")
        setDestination(url.href);
      else setLinkError("This preview supports web links only.");
    } catch {
      setLinkError(
        "This link is not a valid web address. Return to the editor to correct it.",
      );
    }
  }

  return (
    <>
      <div onClickCapture={interceptLink}>
        {linkError ? (
          <p
            role="alert"
            className="border border-danger/30 p-4 text-sm text-danger"
          >
            {linkError}
          </p>
        ) : null}
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
            <p className="mt-4 break-all">{value.externalUrl || "Add a publication URL in the editor."}</p>
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
                  ? "#cms-article-preview"
                  : httpsUrl(value.externalUrl)
                    ? value.externalUrl
                    : "#external-destination"
              }
            />
            </div>
          </div>
        )}
      </div>
      <CmsDialog
        open={destination !== null}
        onClose={() => setDestination(null)}
        title="Open this link?"
        actions={
          <>
            <Button variant="ghost" onPress={() => setDestination(null)}>
              Stay in preview
            </Button>
            <Button
              href={destination ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDestination(null)}
              endContent={
                <ArrowUpRight aria-hidden="true" className="size-4" />
              }
            >
              Open link
            </Button>
          </>
        }
      >
        <p>The link opens in a new tab. Your edits stay here.</p>
        <p className="mt-2 break-all">{destination}</p>
      </CmsDialog>
    </>
  );
}

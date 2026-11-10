"use client";

import { SquarePen } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { articleSummary } from "./article-summary";

export function PublicationArticleTrigger({ value, dirty, error, onOpen }: {
  value: string; dirty: boolean; error?: string; onOpen: () => void;
}) {
  const { excerpt, words } = articleSummary(value);
  return <section aria-labelledby="publication-article-label" className="space-y-3">
    <h3 id="publication-article-label" className="text-sm font-medium">Article</h3>
    <div className={`space-y-5 border p-5 ${error ? "border-danger" : "border-border"}`}>
      {value.trim() ? <p className="line-clamp-3 text-sm leading-6 text-muted">{excerpt || "Article content is ready to edit."}</p> : <div>
        <p className="font-medium">Start writing your article</p>
        <p className="mt-2 text-sm text-muted">Add text, images, links and code.</p>
      </div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{words} {words === 1 ? "word" : "words"} · {dirty ? "Unsaved changes" : "No unsaved changes"}</p>
        <Button id="publication-body-trigger" name="bodyMarkdown" aria-describedby={error ? "publication-body-error" : undefined} variant="outline" startContent={<SquarePen aria-hidden="true" className="size-4" />} onPress={onOpen}>{value.trim() ? "Edit article" : "Write article"}</Button>
      </div>
      {error ? <p id="publication-body-error" className="text-sm text-danger">{error}</p> : null}
    </div>
  </section>;
}

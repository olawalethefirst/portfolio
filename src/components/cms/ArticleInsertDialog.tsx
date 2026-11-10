"use client";

import { useState } from "react";
import { Code, Link } from "lucide-react";
import { httpsUrl } from "@/src/cms/publications";
import type { ArticleInsertion } from "@/src/components/markdown-field/article-formatting";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";
import { CmsField } from "./CmsField";

export function ArticleInsertDialog({ kind, selectedText, onInsert, onClose }: {
  kind: Exclude<ArticleInsertion["kind"], "image">;
  selectedText: string;
  onInsert: (insertion: ArticleInsertion) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(selectedText);
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const title = kind === "link" ? "Insert link" : "Insert code block";
  const Icon = kind === "link" ? Link : Code;

  function insert() {
    const next: Record<string, string> = {};
    if (!text.trim()) next.text = kind === "code" ? "Enter some code." : "Enter link text.";
    if (kind === "link" && !httpsUrl(url)) next.url = "Enter a complete HTTPS destination.";
    if (kind === "code" && language && !/^[a-z0-9_+-]+$/i.test(language)) next.language = "Use a language name such as javascript, ts or css.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onInsert(kind === "code" ? { kind, text, language } : { kind, text: text.trim(), url });
  }

  return <CmsDialog open title={title} onClose={onClose} actions={<>
    <Button variant="ghost" onPress={onClose}>Cancel</Button>
    <Button startContent={<Icon aria-hidden="true" className="size-4" />} onPress={insert}>{title}</Button>
  </>}>
    <div className="space-y-5">
      <CmsField name="insertionText" label={kind === "code" ? "Code" : "Link text"}
        value={text} onChange={setText} multiline={kind === "code" ? "article" : undefined} error={errors.text} />
      {kind === "link" ? <CmsField name="linkDestination" label="Link destination" type="url" icon={<Link aria-hidden="true" className="size-4" />} value={url} onChange={setUrl} error={errors.url} /> : null}
      {kind === "code" ? <CmsField name="codeLanguage" label="Language (optional)" value={language} onChange={setLanguage} hint="For example: javascript, ts, css or sql." error={errors.language} /> : null}
    </div>
  </CmsDialog>;
}

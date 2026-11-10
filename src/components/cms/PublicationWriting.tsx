"use client";

import { Save } from "lucide-react";
import { useContext, useDeferredValue, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/src/components/ui/Button";
import { HeaderActionBar } from "@/src/components/ui/header-action-bar";
import { TextArea } from "@/src/components/ui/TextArea";
import { PublicationMarkdown } from "@/src/components/publication-details/PublicationMarkdown";
import { formatArticle, insertArticleMedia, type ArticleInsertion } from "@/src/components/markdown-field/article-formatting";
import { insertNativeText } from "@/src/components/markdown-field/native-text-edit";
import type { TextSelection } from "@/src/components/markdown-field/markdown-formatting";
import type { PersistenceStatus } from "@/src/cms/working-drafts";
import { CmsPreviewVisibility } from "./CmsShell";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import { Tabs } from "@/src/components/ui/Tabs";
import { ArticleToolbar } from "./ArticleToolbar";
import { ArticleInsertDialog } from "./ArticleInsertDialog";
import { articleSummary } from "./article-summary";
import { ImagePicker } from "./ImagePicker";

export function PublicationWriting({ title, value, onChange, onBlur, onBack, onSave, closeRef, pending, dirty, canSave, message, error, articleError, persistenceStatus }: {
  title: string; value: string; onChange: (value: string) => void; onBlur: () => void;
  onBack: () => void; onSave: () => void; closeRef: RefObject<HTMLButtonElement | null>;
  pending: boolean; dirty: boolean; canSave: boolean; message: string; error: string;
  articleError?: string; persistenceStatus: PersistenceStatus;
}) {
  const setFocused = useContext(CmsPreviewVisibility);
  const [preview, setPreview] = useState(false);
  const [insertion, setInsertion] = useState<{ kind: Exclude<ArticleInsertion["kind"], "image">; range: TextSelection; selectedText: string } | null>(null);
  const [restore, setRestore] = useState<TextSelection | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageOrigin = useRef<{ value: string; range: TextSelection } | null>(null);
  const selection = useRef<TextSelection>({ start: 0, end: 0 });
  const writeScroll = useRef(0);
  const restoreScroll = useRef(false);
  const deferredValue = useDeferredValue(value);
  const { words } = useMemo(() => articleSummary(deferredValue), [deferredValue]);

  useLayoutEffect(() => {
    setFocused?.(true);
    return () => setFocused?.(false);
  }, [setFocused]);
  useLayoutEffect(() => {
    const node = editor.current;
    if (!node || preview) return;
    function resize() {
      if (!node) return;
      node.style.height = "auto";
      node.style.height = `${Math.max(node.scrollHeight, 480)}px`;
    }
    resize();
    if (restore) {
      node.focus({ preventScroll: true });
      node.setSelectionRange(restore.start, restore.end);
      selection.current = restore;
    }
    if (restoreScroll.current) {
      window.scrollTo({ top: writeScroll.current, behavior: "instant" });
      restoreScroll.current = false;
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value, preview, restore]);

  function saveSelection() {
    if (editor.current) selection.current = { start: editor.current.selectionStart, end: editor.current.selectionEnd };
  }
  function apply(result: ReturnType<typeof formatArticle>) {
    const native = !preview && editor.current && insertNativeText(editor.current, result.edit);
    onChange(native ? editor.current!.value : result.text);
    setRestore(result.selection);
  }
  function togglePreview(next: boolean) {
    if (next === preview) return;
    if (next) {
      saveSelection();
      writeScroll.current = window.scrollY;
      setRestore(null);
    } else {
      setRestore({ ...selection.current });
      restoreScroll.current = true;
    }
    setPreview(next);
  }

  function openInsertion(kind: ArticleInsertion["kind"]) {
    if (kind === "image") {
      imageInput.current?.click();
    } else {
      setInsertion({ kind, range: { ...selection.current }, selectedText: value.slice(selection.current.start, selection.current.end) });
    }
  }

  function insertImage(source: string) {
    const origin = imageOrigin.current;
    // Reading/decoding is asynchronous. Preserve intervening edits and use the
    // current caret if the source changed while the image was being read.
    const range = origin?.value === value ? origin.range : {
      start: editor.current?.selectionStart ?? value.length,
      end: editor.current?.selectionEnd ?? value.length,
    };
    const text = value.slice(range.start, range.end).trim() || "Image description";
    apply(insertArticleMedia(value, range, { kind: "image", text, url: source }));
  }

  return <section aria-label="Article writing workspace" className="min-h-dvh bg-surface text-foreground">
    <Tabs variant="secondary" selectedKey={preview ? "preview" : "write"} onSelectionChange={(key) => togglePreview(key === "preview")} className="block w-full gap-0">
      <Tabs.ListContainer className="sticky top-0 z-30 w-full border-b-0! bg-surface!"
        render={(containerProps) => <div {...containerProps}>
          <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-8">
            <HeaderActionBar onBack={onBack} backLabel="Back to publication" backButtonRef={closeRef} actions={
              <Button variant="outline" startContent={<Save aria-hidden="true" className="size-4" />} isDisabled={pending || !canSave} isLoading={pending} onPress={onSave}>Save draft</Button>
            }>
              <h1 className="text-xl font-semibold wrap-anywhere">{title.trim() || "Untitled publication"}</h1>
              <p role="status" aria-label="Publication save status" className="mt-2 text-xs text-muted">
                {pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"} {message}
              </p>
              <ImagePicker presentation="insertion" inputRef={imageInput} name="articleImage" value="" alt=""
                onSelect={() => { imageOrigin.current = { value, range: { ...selection.current } }; }} onChange={insertImage} />
            </HeaderActionBar>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          </div>
          {containerProps.children}
          {!preview ? <ArticleToolbar onFormat={(format) => apply(formatArticle(value, selection.current, format))}
            onInsert={openInsertion} /> : null}
        </div>}>
        <Tabs.List aria-label="Article view" className="mx-auto flex! w-full! min-w-0! max-w-3xl border-b border-border">
          <Tabs.Tab id="write" className="min-h-11 flex-1"><Tabs.Indicator />Write</Tabs.Tab>
          <Tabs.Tab id="preview" className="min-h-11 flex-1"><Tabs.Indicator />Preview</Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    <div className="mx-auto w-full max-w-3xl">
      <Tabs.Panel id="write" shouldForceMount hidden={preview} className="m-0! p-0!">
        <TextArea ref={editor} name="bodyMarkdown" aria-label="Article" aria-invalid={Boolean(articleError)} aria-describedby={articleError ? "writing-article-error" : undefined}
          value={value} placeholder="Write your article in Markdown…" className="block min-h-120 w-full cursor-text resize-none overflow-hidden border-0! bg-transparent px-5 py-8 font-mono text-base leading-8 shadow-none! ring-0! outline-none! sm:px-8"
          onChange={(event) => { setRestore(null); onChange(event.target.value); }} onSelect={saveSelection} onBlur={() => { saveSelection(); onBlur(); }} />
        {articleError ? <p id="writing-article-error" className="px-5 text-sm text-danger sm:px-8">{articleError}</p> : null}
      </Tabs.Panel>
      <Tabs.Panel id="preview" shouldForceMount hidden={!preview} className="m-0! px-5! py-8! sm:px-8!">
        <div role="region" aria-label="Article preview">
          {preview ? value.trim() ? <PublicationMarkdown>{value}</PublicationMarkdown> : <p className="text-muted">Nothing to preview yet.</p> : null}
        </div>
      </Tabs.Panel>
      <footer className="px-5 pb-8 sm:px-8">
        <p className="border-t border-border pt-4 text-xs text-muted">{words} {words === 1 ? "word" : "words"}</p>
        <CmsDraftFeedback status={persistenceStatus} />
      </footer>
    </div>
    </Tabs>
    {insertion ? <ArticleInsertDialog key={insertion.kind} kind={insertion.kind} selectedText={insertion.selectedText}
      onClose={() => { setInsertion(null); setRestore({ ...insertion.range }); }}
      onInsert={(item) => { setInsertion(null); apply(insertArticleMedia(value, insertion.range, item)); }} /> : null}
  </section>;
}

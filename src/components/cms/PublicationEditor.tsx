"use client";

import { Maximize2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCms } from "@/src/cms/CmsProvider";
import {
  emptyPublication,
  publicationState,
  samePublication,
  validatePublication,
  type PublicationAction,
  type PublicationErrors,
  type PublicationRecord,
} from "@/src/cms/publications";
import { Button } from "@/src/components/ui/Button";
import { CmsFeedback, CmsPageHeader, CmsToolbar, CmsFooter } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { CmsBackButton } from "./CmsBackButton";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsDialog } from "./CmsDialog";
import { useWorkingDraft } from "@/src/cms/working-drafts";
import { PublicationFields } from "./PublicationFields";
import { PublicationPreview } from "./PublicationPreview";

export function PublicationEditor({ id }: { id: string }) {
  const { records } = useCms();
  const router = useRouter();
  const record = records.find((item) => item.id === id);
  if (id !== "new" && !record)
    return (
      <CmsShell>
        <CmsBackButton onPress={() => router.push("/admin/publications")}>Back to publications</CmsBackButton>
        <CmsPageHeader title="Publication unavailable" description="Return to publications to start again." />
      </CmsShell>
    );
  return <PublicationEditorForm initialRecord={record} />;
}

function PublicationEditorForm({
  initialRecord,
}: {
  initialRecord?: PublicationRecord;
}) {
  const router = useRouter();
  const { records, commit, pending, working } = useCms();
  const { id, value, setValue } = useWorkingDraft(working, initialRecord?.id ?? "new", () => initialRecord?.draft ?? emptyPublication(), initialRecord?.id);
  const [previewMode, setPreviewMode] = useState<"card" | "detail" | null>(null);
  const [errors, setErrors] = useState<PublicationErrors>({});
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [dialog, setDialog] = useState<"unpublish" | "delete" | null>(null);
  const { closeRef, capture } = useCmsPreview(Boolean(previewMode), () => setPreviewMode(null));
  const record = records.find((item) => item.id === id);
  const dirty = !samePublication(value, record?.draft ?? emptyPublication());

  function openPreview(mode: "card" | "detail") {
    capture(`publication-${mode}-trigger`);
    setPreviewMode(mode);
  }

  async function act(action: PublicationAction | "delete"): Promise<boolean> {
    if (pending) return false;
    setMessage("");
    setRequestError("");
    if (action === "publish") {
      const nextErrors = validatePublication(
        value,
        new Date().toISOString().slice(0, 10),
      );
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      if (first) {
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(),
        );
        return false;
      }
    } else setErrors({});
    try {
      await commit(id, value, action);
      if (action === "delete") {
        router.push("/admin/publications");
      } else setMessage(
        action === "save"
          ? "Saved."
          : action === "publish"
            ? "Published."
            : "Unpublished. Your draft is still available.",
      );
      setDialog(null);
      return true;
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "The request failed. Your edits are still here. Try again.",
      );
      if (action !== "delete") setDialog(null);
      return false;
    }
  }

  if (previewMode) return <CmsPreviewFrame label={previewMode === "card" ? "Publication card preview" : "Publication detail preview"} exitLabel="Exit publication preview" closeRef={closeRef} onExit={() => setPreviewMode(null)}><PublicationPreview value={value} mode={previewMode} /></CmsPreviewFrame>;

  return (
    <CmsShell>
      <CmsBackButton disabled={pending} onPress={() => router.push("/admin/publications")}>Publications</CmsBackButton>
      <CmsPageHeader title={initialRecord ? "Edit publication" : "New publication"} description="Shape your story, then see it through your readers’ eyes." status={record ? publicationState({ ...record, draft: value }) : "New draft"} />
      <CmsToolbar actions={<>
        <Button variant="outline" startContent={<Save aria-hidden="true" className="size-4" />} isDisabled={pending || (!dirty && Boolean(record))} onPress={() => void act("save")}>Save draft</Button>
        <Button startContent={<Send aria-hidden="true" className="size-4" />} isLoading={pending} onPress={() => void act("publish")}>{record?.published ? "Update published" : "Publish"}</Button>
      </>}>
        <Button id="publication-card-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => openPreview("card")}>Preview card</Button>
        <Button id="publication-detail-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => openPreview("detail")}>{value.kind === "local" ? "Preview article" : "Preview destination"}</Button>
      </CmsToolbar>
      <CmsFeedback label="Publication save status" error={dialog === "delete" ? undefined : requestError}>
        <span>{pending ? "Saving…" : dirty ? "Unsaved changes" : record ? "No unsaved changes" : "Not saved yet"}</span> {message ? <span className="text-accent">{message}</span> : null}
      </CmsFeedback>
      <PublicationFields value={value} errors={errors} onChange={setValue} />
      <CmsFooter actions={<>
        {record?.published ? <CmsLifecycleButton action="unpublish" disabled={pending} onPress={() => setDialog("unpublish")}>Unpublish</CmsLifecycleButton> : null}
        {record ? <CmsLifecycleButton action="delete" disabled={pending} onPress={() => { setRequestError(""); setDialog("delete"); }}>Delete publication</CmsLifecycleButton> : null}
      </>}>
        <Button variant="ghost" isDisabled={pending || !dirty} onPress={() => {
          setValue(record?.draft ?? emptyPublication());
          setErrors({});
          setMessage("");
          setRequestError("");
        }}>Discard changes</Button>
      </CmsFooter>
      <CmsDialog
        open={dialog === "delete"}
        onClose={() => { if (!pending) setDialog(null); }}
        title="Delete this publication?"
        error={requestError}
        actions={<>
          <Button variant="ghost" isDisabled={pending} onPress={() => setDialog(null)}>Cancel</Button>
          <CmsLifecycleButton action="delete" confirmation pending={pending} onPress={() => void act("delete")}>Delete</CmsLifecycleButton>
        </>}
      >
        Delete “{value.title.trim() || "Untitled publication"}”? This removes the saved draft, published version and current edits. This cannot be undone.
      </CmsDialog>
      <CmsDialog
        open={dialog === "unpublish"}
        onClose={() => setDialog(null)}
        title="Unpublish this publication?"
        actions={
          <>
            <Button
              variant="ghost"
              isDisabled={pending}
              onPress={() => setDialog(null)}
            >
              Cancel
            </Button>
            <CmsLifecycleButton action="unpublish" confirmation pending={pending} onPress={() => void act("unpublish")}>
              Unpublish
            </CmsLifecycleButton>
          </>
        }
      >
        This removes the published version. Your draft and current edits
        will remain available.
      </CmsDialog>
    </CmsShell>
  );
}

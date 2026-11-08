"use client";

import { Maximize2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCms } from "@/src/cms/CmsProvider";
import {
  emptyPublication,
  publicationState,
  samePublication,
  validatePublication,
  type PublicationAction,
  type PublicationDraft,
  type PublicationErrors,
  type PublicationRecord,
} from "@/src/cms/publications";
import { Button } from "@/src/components/ui/Button";
import { CmsFeedback, CmsPageHeader, CmsToolbar, CmsFooter, CmsDemoControls } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { CmsBackButton } from "./CmsBackButton";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsDialog } from "./CmsDialog";
import { PublicationFields } from "./PublicationFields";
import { PublicationPreview } from "./PublicationPreview";

export function PublicationEditor({ id }: { id: string }) {
  const { records } = useCms();
  const router = useRouter();
  const record = records.find((item) => item.id === id);
  if (id !== "new" && !record)
    return (
      <CmsShell onPublications={() => router.push("/admin/publications")}>
        <CmsBackButton onPress={() => router.push("/admin/publications")}>Back to publications</CmsBackButton>
        <CmsPageHeader title="Publication unavailable" description="Demo drafts reset on reload. Return to publications to start again." />
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
  const { records, commit, pending, failNext, setFailNext } = useCms();
  const [id] = useState(
    () => initialRecord?.id ?? `draft-${crypto.randomUUID()}`,
  );
  const [value, setValue] = useState<PublicationDraft>(
    () => initialRecord?.draft ?? emptyPublication(),
  );
  const [previewMode, setPreviewMode] = useState<"card" | "detail" | null>(null);
  const [errors, setErrors] = useState<PublicationErrors>({});
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [dialog, setDialog] = useState<"leave" | "unpublish" | "delete" | null>(null);
  const { closeRef, capture } = useCmsPreview(Boolean(previewMode), () => setPreviewMode(null));
  const record = records.find((item) => item.id === id);
  const dirty = !samePublication(value, record?.draft ?? emptyPublication());

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function openPreview(mode: "card" | "detail") {
    capture(`publication-${mode}-trigger`);
    setPreviewMode(mode);
  }
  const destination = useRef("/admin/publications");
  function leave(path = "/admin/publications") {
    destination.current = path;
    if (pending) return;
    if (dirty) setDialog("leave");
    else router.push(destination.current);
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
          ? "Saved in demo."
          : action === "publish"
            ? "Published in demo."
            : "Unpublished in demo. Your draft is still available.",
      );
      setDialog(null);
      return true;
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "The demo request failed. Your edits are still here. Try again.",
      );
      if (action !== "delete") setDialog(null);
      return false;
    }
  }

  if (previewMode) return <CmsPreviewFrame label={previewMode === "card" ? "Publication card preview" : "Publication detail preview"} exitLabel="Exit publication preview" closeRef={closeRef} onExit={() => setPreviewMode(null)}><PublicationPreview value={value} mode={previewMode} /></CmsPreviewFrame>;

  return (
    <CmsShell onPublications={() => leave()} onHero={() => leave("/admin/hero")} onProjects={() => leave("/admin/projects")}>
      <CmsBackButton disabled={pending} onPress={() => leave()}>Publications</CmsBackButton>
      <CmsPageHeader title={initialRecord ? "Edit publication" : "New publication"} description="Shape your story, then see it through your readers’ eyes." status={record ? publicationState({ ...record, draft: value }) : "New draft"} />
      <CmsToolbar actions={<>
        <Button variant="outline" startContent={<Save aria-hidden="true" className="size-4" />} isDisabled={pending || (!dirty && Boolean(record))} onPress={() => void act("save")}>Save draft</Button>
        <Button startContent={<Send aria-hidden="true" className="size-4" />} isLoading={pending} onPress={() => void act("publish")}>{record?.published ? "Update published" : "Publish"}</Button>
      </>}>
        <Button id="publication-card-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => openPreview("card")}>Preview card</Button>
        <Button id="publication-detail-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => openPreview("detail")}>{value.kind === "local" ? "Preview article" : "Preview destination"}</Button>
      </CmsToolbar>
      <CmsFeedback label="Publication save status" error={dialog === "delete" ? undefined : requestError}>
        <span>{pending ? "Saving in demo…" : dirty ? "Unsaved changes" : record ? "No unsaved changes" : "Not saved yet"}</span> {message ? <span className="text-accent">{message}</span> : null}
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
      <CmsDemoControls>
        <CmsCheckbox value={failNext} disabled={pending} onChange={setFailNext}>Fail the next publication request</CmsCheckbox>
        <p>Use this to review error recovery. No changes reach the website.</p>
      </CmsDemoControls>
      <CmsDialog
        open={dialog === "leave"}
        onClose={() => setDialog(null)}
        title="Keep your changes?"
        actions={
          <>
            <Button
              variant="ghost"
              isDisabled={pending}
              onPress={() => setDialog(null)}
            >
              Stay
            </Button>
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => router.push(destination.current)}
            >
              Discard
            </Button>
            <Button
              isLoading={pending}
              startContent={<Save aria-hidden="true" className="size-4" />}
              onPress={async () => {
                if (await act("save")) router.push(destination.current);
              }}
            >
              Save and leave
            </Button>
          </>
        }
      >
        You have unsaved edits. Save a draft before returning to publications,
        or discard these changes.
      </CmsDialog>
      <CmsDialog
        open={dialog === "delete"}
        onClose={() => { if (!pending) setDialog(null); }}
        title="Delete this publication?"
        error={requestError}
        actions={<>
          <Button variant="ghost" isDisabled={pending} onPress={() => setDialog(null)}>Cancel</Button>
          <CmsLifecycleButton action="delete" confirmation pending={pending} onPress={() => void act("delete")}>Delete in demo</CmsLifecycleButton>
        </>}
      >
        Delete “{value.title.trim() || "Untitled publication"}”? This removes the saved draft, published version and current edits from this demo session. This cannot be undone in this session.
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
              Unpublish in demo
            </CmsLifecycleButton>
          </>
        }
      >
        This removes the demo-published version. Your draft and current edits
        will remain available.
      </CmsDialog>
    </CmsShell>
  );
}

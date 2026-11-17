"use client";

import { Maximize2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { Form } from "@heroui/react";
import { useId, useRef, useState } from "react";
import { useCms } from "@/src/cms/CmsProvider";
import { usePublicationsQuery } from "@/src/cms/publication-queries";
import {
  emptyPublication,
  publicationState,
  publicationDraftSchema,
  samePublication,
  validatePublication,
  type PublicationAction,
  type PublicationDraft,
  type PublicationErrors,
  type PublicationRecord,
} from "@/src/cms/publications";
import { Button } from "@/src/components/ui/Button";
import { LoadingState } from "@/src/components/ui/LoadingState";
import {
  CmsEmptyState,
  CmsFeedback,
  CmsPageHeader,
  CmsToolbar,
  CmsFooter,
} from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsDialog } from "./CmsDialog";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import { useWorkingDraft } from "@/src/cms/working-drafts";
import { PublicationFields } from "./PublicationFields";
import { PublicationPreview } from "./PublicationPreview";
import { PublicationWriting } from "./PublicationWriting";

export function PublicationEditor({ id }: { id: string }) {
  const router = useRouter();
  // "new" needs no existing record, so it never waits on the collection.
  const { data, isPending, isError, refetch } = usePublicationsQuery();
  if (id === "new") return <PublicationEditorForm />;
  if (isPending) return <LoadingState label="Loading publication" />;
  if (isError)
    return (
      <CmsEmptyState
        title="Couldn’t load this publication"
        description="The publication could not be read. Check your connection and try again."
        action={
          <Button variant="ghost" onPress={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  const record = data.find((item) => item.id === id);
  if (!record)
    return (
      <CmsPageHeader
        onBack={() => router.push("/admin/publications")}
        backLabel="Back to publications"
        title="Publication unavailable"
        description="Return to publications to start again."
      />
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
  const { id, value, setValue, reset, ready, persistenceStatus } =
    useWorkingDraft(
      working,
      initialRecord?.id ?? "new",
      () => initialRecord?.draft ?? emptyPublication(),
      initialRecord?.id,
    );
  const [previewMode, setPreviewMode] = useState<"card" | "detail" | null>(
    null,
  );
  const [writing, setWriting] = useState(false);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [exposed, setExposed] = useState<
    Partial<Record<keyof PublicationDraft, boolean>>
  >({});
  const [publishAttempted, setPublishAttempted] = useState(false);
  const [imageReset, setImageReset] = useState(0);
  const [imageSelected, setImageSelected] = useState(false);
  const currentErrors = validatePublication(
    value,
    new Date().toISOString().slice(0, 10),
  );
  const errors: PublicationErrors = {};
  for (const field of Object.keys(
    currentErrors,
  ) as (keyof PublicationDraft)[]) {
    if (publishAttempted || exposed[field])
      errors[field] = currentErrors[field];
  }
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [dialog, setDialog] = useState<"unpublish" | "delete" | null>(null);
  const { closeRef, capture } = useCmsPreview(
    Boolean(previewMode) || writing,
    () => {
      setPreviewMode(null);
      setWriting(false);
    },
  );
  const record = records.find((item) => item.id === id);
  const dirty = !samePublication(value, record?.draft ?? emptyPublication());

  function changeValue(next: PublicationDraft) {
    if (pending) return;
    setRequestError("");
    setMessage("");
    setValue(next);
  }
  const expose = (field: keyof PublicationDraft) =>
    setExposed((current) => ({ ...current, [field]: true }));

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
      setPublishAttempted(true);
      const order: (keyof PublicationDraft)[] = [
        "title",
        "summary",
        "bodyMarkdown",
        "tagsText",
        "coverSrc",
        "coverAlt",
        "publishedOn",
      ];
      const first = order.find((field) => nextErrors[field]);
      if (first) {
        requestAnimationFrame(() =>
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus(),
        );
        return false;
      }
    } else if (action === "save") {
      const result = publicationDraftSchema.safeParse(value);
      if (!result.success) {
        setRequestError(result.error.issues[0].message);
        return false;
      }
    }
    try {
      await commit(id, value, action);
      if (action === "delete") {
        router.push("/admin/publications");
      } else
        setMessage(
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

  if (!ready) return <p role="status">Restoring local draft…</p>;
  if (writing)
    return (
      <PublicationWriting
        title={value.title}
        value={value.bodyMarkdown}
        onChange={(bodyMarkdown) => changeValue({ ...value, bodyMarkdown })}
        onBlur={() => expose("bodyMarkdown")}
        onBack={() => setWriting(false)}
        onSave={() => void act("save")}
        closeRef={closeRef}
        pending={pending}
        dirty={dirty}
        canSave={dirty || !record}
        message={message}
        error={requestError}
        articleError={errors.bodyMarkdown}
        persistenceStatus={persistenceStatus}
      />
    );
  if (previewMode)
    return (
      <CmsPreviewFrame
        label={
          previewMode === "card"
            ? "Publication card preview"
            : "Publication detail preview"
        }
        exitLabel="Exit publication preview"
        closeRef={closeRef}
        onExit={() => setPreviewMode(null)}
      >
        <PublicationPreview value={value} mode={previewMode} />
      </CmsPreviewFrame>
    );

  return (
    <>
      <CmsPageHeader
        onBack={() => router.push("/admin/publications")}
        backLabel="Back to publications"
        backDisabled={pending}
        title={initialRecord ? "Edit publication" : "New publication"}
        description="Shape your story, then see it through your readers’ eyes."
        status={
          record ? publicationState({ ...record, draft: value }) : "New draft"
        }
        action={
          <>
            <Button
              type="submit"
              form={formId}
              name="intent"
              value="save"
              variant="outline"
              startContent={<Save aria-hidden="true" className="size-4" />}
              isDisabled={pending || (!dirty && Boolean(record))}
            >
              Save draft
            </Button>
            <Button
              type="submit"
              form={formId}
              name="intent"
              value="publish"
              startContent={<Send aria-hidden="true" className="size-4" />}
              isLoading={pending}
            >
              {record?.published ? "Update published" : "Publish"}
            </Button>
          </>
        }
      />
      <CmsToolbar>
        <Button
          type="button"
          id="publication-card-trigger"
          isDisabled={pending}
          variant="outline"
          startContent={<Maximize2 aria-hidden="true" className="size-4" />}
          onPress={() => openPreview("card")}
        >
          Preview card
        </Button>
        <Button
          type="button"
          id="publication-detail-trigger"
          isDisabled={pending}
          variant="outline"
          startContent={<Maximize2 aria-hidden="true" className="size-4" />}
          onPress={() => openPreview("detail")}
        >
          Preview article
        </Button>
      </CmsToolbar>
      <CmsDraftFeedback status={persistenceStatus} />
      <CmsFeedback
        label="Publication save status"
        error={dialog === "delete" ? undefined : requestError}
      >
        <span>
          {pending
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : record
                ? "No unsaved changes"
                : "Not saved yet"}
        </span>{" "}
        {message ? <span className="text-accent">{message}</span> : null}
      </CmsFeedback>
      <Form
        id={formId}
        ref={formRef}
        className="block"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const publish =
            submitter instanceof HTMLButtonElement &&
            submitter.name === "intent" &&
            submitter.value === "publish";
          void act(publish ? "publish" : "save");
        }}
      >
        <fieldset disabled={pending} aria-busy={pending} className="min-w-0">
          <PublicationFields
            articleDirty={
              value.bodyMarkdown !== (record?.draft.bodyMarkdown ?? "")
            }
            onWriteArticle={() => {
              capture("publication-body-trigger");
              setWriting(true);
            }}
            value={value}
            errors={errors}
            onChange={changeValue}
            onBlur={expose}
            imageReset={imageReset}
            onImageSelect={() => setImageSelected(true)}
          />
        </fieldset>
      </Form>
      <CmsFooter
        actions={
          <>
            {record?.published ? (
              <CmsLifecycleButton
                action="unpublish"
                disabled={pending}
                onPress={() => setDialog("unpublish")}
              >
                Unpublish
              </CmsLifecycleButton>
            ) : null}
            {record ? (
              <CmsLifecycleButton
                action="delete"
                disabled={pending}
                onPress={() => {
                  setRequestError("");
                  setDialog("delete");
                }}
              >
                Delete publication
              </CmsLifecycleButton>
            ) : null}
          </>
        }
      >
        <Button
          type="button"
          variant="ghost"
          isDisabled={
            pending ||
            (!dirty &&
              !imageSelected &&
              !publishAttempted &&
              !Object.keys(exposed).length)
          }
          onPress={() => {
            reset(record?.draft ?? emptyPublication());
            setExposed({});
            setPublishAttempted(false);
            setImageSelected(false);
            setImageReset((current) => current + 1);
            setMessage("");
            setRequestError("");
          }}
        >
          Discard changes
        </Button>
      </CmsFooter>
      <CmsDialog
        open={dialog === "delete"}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
        title="Delete this publication?"
        error={requestError}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              isDisabled={pending}
              onPress={() => setDialog(null)}
            >
              Cancel
            </Button>
            <CmsLifecycleButton
              action="delete"
              confirmation
              pending={pending}
              onPress={() => void act("delete")}
            >
              Delete
            </CmsLifecycleButton>
          </>
        }
      >
        Delete “{value.title.trim() || "Untitled publication"}”? This removes
        the saved draft, published version and current edits. This cannot be
        undone.
      </CmsDialog>
      <CmsDialog
        open={dialog === "unpublish"}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
        title="Unpublish this publication?"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              isDisabled={pending}
              onPress={() => setDialog(null)}
            >
              Cancel
            </Button>
            <CmsLifecycleButton
              action="unpublish"
              confirmation
              pending={pending}
              onPress={() => void act("unpublish")}
            >
              Unpublish
            </CmsLifecycleButton>
          </>
        }
      >
        This removes the published version. Your draft and current edits will
        remain available.
      </CmsDialog>
    </>
  );
}

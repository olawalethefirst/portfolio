"use client";
import { Maximize2, Save, Send } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Form } from "@heroui/react";
import { useId, useRef, useState, type ComponentProps } from "react";
import { useProjects } from "@/src/cms/ProjectProvider";
import {
  useProjectMutations,
  useProjectsQuery,
} from "@/src/cms/project-queries";
import {
  emptyProject,
  projectDraftSchema,
  projectStatus,
  sameProject,
  validateProject,
  type ProjectAction,
  type ProjectDraft,
  type ProjectErrors,
  type ProjectRecord,
} from "@/src/cms/projects";
import { Button } from "@/src/components/ui/Button";
import { LoadingState } from "@/src/components/ui/LoadingState";
import {
  CmsLoadError,
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
import { useImageUpload } from "@/src/media/use-image-upload";
import type { UploadConfig } from "@/src/media/upload-reference";
import { ProjectFields } from "./ProjectFields";

const ProjectPreview = dynamic(
  () => import("./ProjectPreview").then((module) => module.ProjectPreview),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading project preview" />,
  },
);

function ProjectEditorHeader({
  isNew = false,
  ...rest
}: { isNew?: boolean } & Partial<ComponentProps<typeof CmsPageHeader>>) {
  const router = useRouter();
  return (
    <CmsPageHeader
      onBack={() => router.push("/admin/projects")}
      backLabel="Back to projects"
      title={isNew ? "New project" : "Edit project"}
      description="Shape your project, then preview it as visitors will see it."
      {...rest}
    />
  );
}

export function ProjectEditor({
  id,
  uploadConfig = { url: "", publishableKey: "" },
}: {
  id: string;
  uploadConfig?: UploadConfig;
}) {
  const router = useRouter();
  // "new" needs no existing record, so it never waits on the collection.
  const { data, isPending, isError, refetch } = useProjectsQuery();
  if (id === "new") return <ProjectEditorForm uploadConfig={uploadConfig} />;
  if (isPending)
    return (
      <>
        <ProjectEditorHeader />
        <LoadingState label="Loading project" />
      </>
    );
  if (isError)
    return (
      <>
        <ProjectEditorHeader />
        <CmsLoadError
          title="Couldn’t load this project"
          description="The project could not be read. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </>
    );
  const record = data.find((item) => item.id === id);
  if (!record)
    return (
      <CmsPageHeader
        onBack={() => router.push("/admin/projects")}
        backLabel="Back to projects"
        title="Project unavailable"
        description="Return to projects to start again."
      />
    );
  return (
    <ProjectEditorForm initialRecord={record} uploadConfig={uploadConfig} />
  );
}
function ProjectEditorForm({
  initialRecord,
  uploadConfig,
}: {
  initialRecord?: ProjectRecord;
  uploadConfig: UploadConfig;
}) {
  const router = useRouter();
  const { working } = useProjects();
  const { data: records } = useProjectsQuery();
  const { commit } = useProjectMutations();
  // No record yet means "new": the real ID only exists once the first
  // Save/Publish succeeds, at which point the editor redirects to it.
  const recordId = initialRecord?.id ?? "new";
  const { value, setValue, reset, ready, persistenceStatus } = useWorkingDraft(
    working,
    recordId,
    () => initialRecord?.draft ?? emptyProject(),
    initialRecord?.id,
  );
  const imageUpload = useImageUpload(uploadConfig);
  // The mutation's own isPending can lag a tick behind this click; set
  // synchronously so the fieldset locks in the same render as the submit.
  const [saving, setSaving] = useState(false);
  const pending = saving || imageUpload.isPending;
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [exposed, setExposed] = useState<
    Partial<Record<keyof ProjectDraft, boolean>>
  >({});
  const [publishAttempted, setPublishAttempted] = useState(false);
  const [imageReset, setImageReset] = useState(0);
  const [imageSelected, setImageSelected] = useState(false);
  const currentErrors = validateProject(value);
  const errors: ProjectErrors = {};
  for (const field of Object.keys(currentErrors) as (keyof ProjectDraft)[]) {
    if (publishAttempted || exposed[field])
      errors[field] = currentErrors[field];
  }
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"unpublish" | "delete" | null>(null);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const record = records?.find((item) => item.id === recordId);
  const dirty = !sameProject(value, record?.draft ?? emptyProject());

  function changeValue(next: ProjectDraft) {
    if (pending) return;
    setError("");
    setMessage("");
    setValue(next);
  }
  function selectImage(file: File) {
    setError("");
    setMessage("");
    imageUpload.mutate(file, {
      onSuccess: (image) => {
        setValue((current) => ({ ...current, screenshot: image.source }));
      },
    });
  }
  const expose = (field: keyof ProjectDraft) =>
    setExposed((current) => ({ ...current, [field]: true }));

  async function act(action: ProjectAction) {
    if (pending) return false;
    setError("");
    setMessage("");
    const nextErrors = action === "publish" ? validateProject(value) : {};
    if (action === "publish") setPublishAttempted(true);
    if (action === "save") {
      const result = projectDraftSchema.safeParse(value);
      if (!result.success) {
        setError(result.error.issues[0].message);
        return false;
      }
    }
    const order: (keyof ProjectDraft)[] = [
      "name",
      "summary",
      "what",
      "how",
      "tagsText",
      "platform",
      "liveUrl",
      "screenshot",
      "screenshotAlt",
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
    setSaving(true);
    try {
      const result = await commit(recordId, value, action);
      if (recordId === "new") {
        // "new" only ever saves or publishes, which always create and
        // return the canonical record; move to it so the next Save updates
        // this Project instead of creating another one.
        working.clear("new");
        router.push(`/admin/projects/${(result as ProjectRecord).id}`);
        return true;
      }
      setDialog(null);
      if (action === "delete") router.push("/admin/projects");
      else
        setMessage(
          action === "save"
            ? "Saved."
            : action === "publish"
              ? "Published."
              : "Unpublished. Your draft is still available.",
        );
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The request failed. Try again.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  if (!ready)
    return (
      <>
        <ProjectEditorHeader isNew={!initialRecord} />
        <LoadingState label="Restoring local draft" />
      </>
    );
  if (preview)
    return (
      <CmsPreviewFrame
        label="Project preview"
        exitLabel="Exit project preview"
        closeRef={closeRef}
        onExit={() => setPreview(false)}
      >
        <ProjectPreview value={value} />
      </CmsPreviewFrame>
    );
  return (
    <>
      <ProjectEditorHeader
        isNew={!initialRecord}
        backDisabled={pending}
        status={
          record ? projectStatus({ ...record, draft: value }) : "New draft"
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
              isLoading={saving}
              isDisabled={pending}
            >
              {record?.published ? "Update published" : "Publish"}
            </Button>
          </>
        }
      />
      <CmsToolbar>
        <Button
          type="button"
          id="project-preview-trigger"
          isDisabled={pending}
          variant="outline"
          startContent={<Maximize2 aria-hidden="true" className="size-4" />}
          onPress={() => {
            capture("project-preview-trigger");
            setPreview(true);
          }}
        >
          Preview project
        </Button>
      </CmsToolbar>
      <CmsDraftFeedback status={persistenceStatus} />
      <CmsFeedback
        label="Project save status"
        error={!dialog ? error : undefined}
      >
        {pending
          ? imageUpload.isPending
            ? "Uploading image…"
            : "Saving…"
          : dirty
            ? "Unsaved changes"
            : record
              ? "No unsaved changes"
              : "Not saved yet"}{" "}
        {message}
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
          <ProjectFields
            imagePickerProps={{
              onFileSelect: selectImage,
              isPending: imageUpload.isPending,
              error: imageUpload.error?.message,
              onRetry:
                imageUpload.isError && imageUpload.variables
                  ? () => selectImage(imageUpload.variables!)
                  : undefined,
              onChange: (screenshot) => {
                imageUpload.reset();
                setValue((current) => ({ ...current, screenshot }));
              },
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
                onPress={() => {
                  setError("");
                  setDialog("unpublish");
                }}
              >
                Unpublish
              </CmsLifecycleButton>
            ) : null}
            {record ? (
              <CmsLifecycleButton
                action="delete"
                disabled={pending}
                onPress={() => {
                  setError("");
                  setDialog("delete");
                }}
              >
                Delete project
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
            imageUpload.reset();
            reset(record?.draft ?? emptyProject());
            setExposed({});
            setPublishAttempted(false);
            setImageSelected(false);
            setImageReset((current) => current + 1);
            setMessage("");
            setError("");
          }}
        >
          Discard changes
        </Button>
      </CmsFooter>

      <CmsDialog
        open={dialog === "unpublish" || dialog === "delete"}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
        title={
          dialog === "delete"
            ? "Delete this project?"
            : "Unpublish this project?"
        }
        error={error}
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
              action={dialog === "delete" ? "delete" : "unpublish"}
              confirmation
              pending={pending}
              onPress={() =>
                void act(dialog === "delete" ? "delete" : "unpublish")
              }
            >
              {dialog === "delete" ? "Delete" : "Unpublish"}
            </CmsLifecycleButton>
          </>
        }
      >
        {dialog === "delete"
          ? `Delete “${value.name || "Untitled project"}”? This removes the saved draft, published version and current edits.`
          : "This removes the published version. Your saved draft and current edits remain available."}
      </CmsDialog>
    </>
  );
}

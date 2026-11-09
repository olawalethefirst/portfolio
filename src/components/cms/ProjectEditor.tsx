"use client";
import { Maximize2, Save, Send } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Form } from "@heroui/react";
import { useId, useRef, useState } from "react";
import { useProjects } from "@/src/cms/ProjectProvider";
import { emptyProject, projectDraftSchema, projectStatus, sameProject, validateProject, type ProjectAction, type ProjectDraft, type ProjectErrors, type ProjectRecord } from "@/src/cms/projects";
import { Button } from "@/src/components/ui/Button";
import { CmsFeedback, CmsPageHeader, CmsToolbar, CmsFooter } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsBackButton } from "./CmsBackButton";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsDialog } from "./CmsDialog";
import { useWorkingDraft } from "@/src/cms/working-drafts";
import { ProjectFields } from "./ProjectFields";

const ProjectPreview = dynamic(() => import("./ProjectPreview").then((module) => module.ProjectPreview), {
  ssr: false,
  loading: () => <p role="status">Loading project preview…</p>,
});

export function ProjectEditor({ id }: { id: string }) {
  const { records } = useProjects();
  const router = useRouter();
  const record = records.find((item) => item.id === id);
  if (id !== "new" && !record) return <><CmsBackButton onPress={() => router.push("/admin/projects")}>Back to projects</CmsBackButton><CmsPageHeader title="Project unavailable" description="Return to projects to start again." /></>;
  return <ProjectEditorForm initialRecord={record} />;
}
function ProjectEditorForm({ initialRecord }: { initialRecord?: ProjectRecord }) {
  const router = useRouter();
  const { records, commit, pending, working } = useProjects();
  const { id, value, setValue } = useWorkingDraft(working, initialRecord?.id ?? "new", () => initialRecord?.draft ?? emptyProject(), initialRecord?.id);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const revision = useRef(0);
  const [exposed, setExposed] = useState<Partial<Record<keyof ProjectDraft, boolean>>>({});
  const [publishAttempted, setPublishAttempted] = useState(false);
  const [imageReset, setImageReset] = useState(0);
  const [imageSelected, setImageSelected] = useState(false);
  const currentErrors = validateProject(value);
  const errors: ProjectErrors = {};
  for (const field of Object.keys(currentErrors) as (keyof ProjectDraft)[]) {
    if (publishAttempted || exposed[field]) errors[field] = currentErrors[field];
  }
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"unpublish" | "delete" | null>(null);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const record = records.find((item) => item.id === id);
  const dirty = !sameProject(value, record?.draft ?? emptyProject());


  function changeValue(next: ProjectDraft) {
    revision.current += 1;
    setError(""); setMessage("");
    setValue(next);
  }
  const expose = (field: keyof ProjectDraft) => setExposed((current) => ({ ...current, [field]: true }));

  async function act(action: ProjectAction) {
    if (pending) return false;
    setError(""); setMessage("");
    const nextErrors = action === "publish" ? validateProject(value) : {};
    if (action === "publish") setPublishAttempted(true);
    if (action === "save") {
      const result = projectDraftSchema.safeParse(value);
      if (!result.success) { setError(result.error.issues[0].message); return false; }
    }
    const order: (keyof ProjectDraft)[] = ["name", "summary", "what", "how", "platform", "liveUrl", "screenshot", ...(!value.decorative ? ["screenshotAlt" as const] : [])];
    const first = order.find((field) => nextErrors[field]);
    if (first) { requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()); return false; }
    const submittedRevision = revision.current;
    try {
      await commit(id, value, action);
      setDialog(null);
      if (action === "delete") router.push("/admin/projects");
      else if (revision.current === submittedRevision) setMessage(action === "save" ? "Saved." : action === "publish" ? "Published." : "Unpublished. Your draft is still available.");
      return true;
    } catch (failure) {
      if (action === "delete" || action === "unpublish" || revision.current === submittedRevision) setError(failure instanceof Error ? failure.message : "The request failed. Try again.");
      return false;
    }
  }
  if (preview) return <CmsPreviewFrame label="Project preview" exitLabel="Exit project preview" closeRef={closeRef} onExit={() => setPreview(false)}><ProjectPreview value={value} /></CmsPreviewFrame>;
  return <>
    <CmsBackButton disabled={pending} onPress={() => router.push("/admin/projects")}>Back to projects</CmsBackButton>
    <CmsPageHeader title={initialRecord ? "Edit project" : "New project"} description="Shape your project, then preview it as visitors will see it." status={record ? projectStatus({ ...record, draft: value }) : "New draft"} />
    <CmsToolbar actions={<><Button type="submit" form={formId} name="intent" value="save" variant="outline" startContent={<Save aria-hidden="true" className="size-4" />} isDisabled={pending || (!dirty && Boolean(record))}>Save draft</Button><Button type="submit" form={formId} name="intent" value="publish" startContent={<Send aria-hidden="true" className="size-4" />} isLoading={pending}>{record?.published ? "Update published" : "Publish"}</Button></>}>
      <Button type="button" id="project-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("project-preview-trigger"); setPreview(true); }}>Preview project</Button>
    </CmsToolbar>
    <CmsFeedback label="Project save status" error={!dialog ? error : undefined}>{pending ? "Saving…" : dirty ? "Unsaved changes" : record ? "No unsaved changes" : "Not saved yet"} {message}</CmsFeedback>
    <Form id={formId} ref={formRef} className="block" validationBehavior="aria" onSubmit={(event) => {
      event.preventDefault();
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const publish = submitter instanceof HTMLButtonElement && submitter.name === "intent" && submitter.value === "publish";
      void act(publish ? "publish" : "save");
    }}>
      <ProjectFields value={value} errors={errors} onChange={changeValue} onBlur={expose} imageReset={imageReset} onImageSelect={() => setImageSelected(true)} />
    </Form>
    <CmsFooter actions={<>
      {record?.published ? <CmsLifecycleButton action="unpublish" disabled={pending} onPress={() => { setError(""); setDialog("unpublish"); }}>Unpublish</CmsLifecycleButton> : null}
      {record ? <CmsLifecycleButton action="delete" disabled={pending} onPress={() => { setError(""); setDialog("delete"); }}>Delete project</CmsLifecycleButton> : null}
    </>}>
      <Button type="button" variant="ghost" isDisabled={pending || (!dirty && !imageSelected && !publishAttempted && !Object.keys(exposed).length)} onPress={() => {
        setValue(record?.draft ?? emptyProject());
        revision.current += 1;
        setExposed({});
        setPublishAttempted(false);
        setImageSelected(false);
        setImageReset((current) => current + 1);
        setMessage("");
        setError("");
      }}>Discard changes</Button>
    </CmsFooter>

    <CmsDialog open={dialog === "unpublish" || dialog === "delete"} onClose={() => { if (!pending) setDialog(null); }} title={dialog === "delete" ? "Delete this project?" : "Unpublish this project?"} error={error} actions={<>
      <Button type="button" variant="ghost" isDisabled={pending} onPress={() => setDialog(null)}>Cancel</Button>
      <CmsLifecycleButton action={dialog === "delete" ? "delete" : "unpublish"} confirmation pending={pending} onPress={() => void act(dialog === "delete" ? "delete" : "unpublish")}>{dialog === "delete" ? "Delete" : "Unpublish"}</CmsLifecycleButton>
    </>}>
      {dialog === "delete" ? `Delete “${value.name || "Untitled project"}”? This removes the saved draft, published version and current edits.` : "This removes the published version. Your saved draft and current edits remain available."}
    </CmsDialog>
  </>;
}

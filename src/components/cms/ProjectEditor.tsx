"use client";
import { Maximize2, Save, Send } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProjects } from "@/src/cms/ProjectProvider";
import { emptyProject, projectStatus, sameProject, validateProject, type ProjectAction, type ProjectErrors, type ProjectRecord } from "@/src/cms/projects";
import { Button } from "@/src/components/ui/Button";
import { CmsFeedback, CmsPageHeader, CmsToolbar, CmsFooter, CmsDemoControls } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
import { CmsBackButton } from "./CmsBackButton";
import { CmsCheckbox } from "./CmsCheckbox";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import { CmsDialog } from "./CmsDialog";
import { CmsUnsavedChangesDialog, useCmsUnsavedChanges } from "./CmsUnsavedChanges";
import { ProjectFields } from "./ProjectFields";

const ProjectPreview = dynamic(() => import("./ProjectPreview").then((module) => module.ProjectPreview), {
  ssr: false,
  loading: () => <p role="status">Loading project preview…</p>,
});

export function ProjectEditor({ id }: { id: string }) {
  const { records } = useProjects();
  const router = useRouter();
  const record = records.find((item) => item.id === id);
  if (id !== "new" && !record) return <CmsShell section="projects"><CmsBackButton onPress={() => router.push("/admin/projects")}>Back to projects</CmsBackButton><CmsPageHeader title="Project unavailable" description="Demo drafts reset on reload. Return to projects to start again." /></CmsShell>;
  return <ProjectEditorForm initialRecord={record} />;
}
function ProjectEditorForm({ initialRecord }: { initialRecord?: ProjectRecord }) {
  const router = useRouter();
  const { records, commit, pending, failNext, setFailNext } = useProjects();
  const [id] = useState(() => initialRecord?.id ?? `project-${crypto.randomUUID()}`);
  const [value, setValue] = useState(() => initialRecord?.draft ?? emptyProject());
  const [errors, setErrors] = useState<ProjectErrors>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"unpublish" | "delete" | null>(null);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const record = records.find((item) => item.id === id);
  const dirty = !sameProject(value, record?.draft ?? emptyProject());

  const navigation = useCmsUnsavedChanges({ dirty, pending, save: () => act("save"), navigate: (path) => router.push(path) });
  const leave = navigation.leave;

  async function act(action: ProjectAction) {
    if (pending) return false;
    setError(""); setMessage("");
    const nextErrors = action === "publish" ? validateProject(value) : {};
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) { setPreview(false); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()); return false; }
    try {
      await commit(id, value, action);
      setDialog(null);
      if (action === "delete") router.push("/admin/projects");
      else setMessage(action === "save" ? "Saved in demo." : action === "publish" ? "Published in demo." : "Unpublished in demo. Your draft is still available.");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The demo request failed. Try again.");
      return false;
    }
  }
  if (preview) return <CmsPreviewFrame label="Project preview" exitLabel="Exit project preview" closeRef={closeRef} onExit={() => setPreview(false)}><ProjectPreview value={value} /></CmsPreviewFrame>;
  return <CmsShell section="projects" onNavigate={leave}>
    <CmsBackButton disabled={pending} onPress={() => leave("/admin/projects")}>Back to projects</CmsBackButton>
    <CmsPageHeader title={initialRecord ? "Edit project" : "New project"} description="Shape your project, then preview it as visitors will see it." status={record ? projectStatus({ ...record, draft: value }) : "New draft"} />
    <CmsToolbar actions={<><Button variant="outline" startContent={<Save aria-hidden="true" className="size-4" />} isDisabled={pending || (!dirty && Boolean(record))} onPress={() => void act("save")}>Save draft</Button><Button startContent={<Send aria-hidden="true" className="size-4" />} isLoading={pending} onPress={() => void act("publish")}>{record?.published ? "Update published" : "Publish"}</Button></>}>
      <Button id="project-preview-trigger" variant="outline" startContent={<Maximize2 aria-hidden="true" className="size-4" />} onPress={() => { capture("project-preview-trigger"); setPreview(true); }}>Preview project</Button>
    </CmsToolbar>
    <CmsFeedback label="Project save status" error={!dialog && !navigation.dialog.open ? error : undefined}>{pending ? "Saving in demo…" : dirty ? "Unsaved changes" : record ? "No unsaved changes" : "Not saved yet"} {message}</CmsFeedback>
    <ProjectFields value={value} errors={errors} onChange={setValue} />
    <CmsFooter actions={<>
      {record?.published ? <CmsLifecycleButton action="unpublish" disabled={pending} onPress={() => { setError(""); setDialog("unpublish"); }}>Unpublish</CmsLifecycleButton> : null}
      {record ? <CmsLifecycleButton action="delete" disabled={pending} onPress={() => { setError(""); setDialog("delete"); }}>Delete project</CmsLifecycleButton> : null}
    </>}>
      <Button variant="ghost" isDisabled={pending || !dirty} onPress={() => {
        setValue(record?.draft ?? emptyProject());
        setErrors({});
        setMessage("");
        setError("");
      }}>Discard changes</Button>
    </CmsFooter>
    <CmsDemoControls><CmsCheckbox value={failNext} disabled={pending} onChange={setFailNext}>Fail the next project request</CmsCheckbox></CmsDemoControls>
    <CmsUnsavedChangesDialog {...navigation.dialog} error={error} />
    <CmsDialog open={dialog === "unpublish" || dialog === "delete"} onClose={() => { if (!pending) setDialog(null); }} title={dialog === "delete" ? "Delete this project?" : "Unpublish this project?"} error={error} actions={<>
      <Button variant="ghost" isDisabled={pending} onPress={() => setDialog(null)}>Cancel</Button>
      <CmsLifecycleButton action={dialog === "delete" ? "delete" : "unpublish"} confirmation pending={pending} onPress={() => void act(dialog === "delete" ? "delete" : "unpublish")}>{dialog === "delete" ? "Delete in demo" : "Unpublish in demo"}</CmsLifecycleButton>
    </>}>
      {dialog === "delete" ? `Delete “${value.name || "Untitled project"}”? This removes the saved draft, published version and current edits from this demo session.` : "This removes the demo-published version. Your saved draft and current edits remain available."}
    </CmsDialog>
  </CmsShell>;
}

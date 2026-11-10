"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { CmsCollectionActions } from "./CmsCollectionActions";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { useProjects } from "@/src/cms/ProjectProvider";
import { projectStatus } from "@/src/cms/projects";
import { Button } from "@/src/components/ui/Button";
import { CmsEmptyState, CmsPageHeader, CmsFeedback, CmsRecordRow, CmsRecordLink } from "./CmsLayout";
import { CmsOrderActions, CmsOrderHint } from "./CmsOrderActions";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";

const CollectionPreview = dynamic(() => import("./ProjectCollectionPreview").then((module) => module.ProjectCollectionPreview), {
  ssr: false,
  loading: () => <p role="status">Loading project section preview…</p>,
});

export function ProjectList() {
  const router = useRouter();
  const { records, move, pending, working } = useProjects();
  const [announcement, setAnnouncement] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const [status, setStatus] = useState("all");
  const filtered = Boolean(search.trim()) || status !== "all";
  const shown = records.filter(({ draft, published }) =>
    `${draft.name} ${draft.summary}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === "all" || (status === "published" ? Boolean(published) : !published)),
  );
  if (preview) return <CmsPreviewFrame label="Project section preview" exitLabel="Exit project section preview" closeRef={closeRef} onExit={() => setPreview(false)}><CollectionPreview records={records} /></CmsPreviewFrame>;
  return <>
    <CmsPageHeader title="Projects" description="The work you want to share." action={<CmsCollectionActions collection="project" pending={pending} onNew={() => { working.clear("new"); router.push("/admin/projects/new"); }} onPreview={() => { capture("project-section-trigger"); setPreview(true); }} />} />
    <CmsCollectionToolbar collection="projects" search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />
    <CmsFeedback>
      <p>{shown.length} {shown.length === 1 ? "project" : "projects"}</p>
      <CmsOrderHint />
    </CmsFeedback>
    <p role="status" aria-label="Project order" className="sr-only">{announcement}</p>
    <ul className="divide-y divide-border border-y border-border">
      {shown.map((item, index) => <CmsRecordRow key={item.id} actions={<CmsOrderActions
        name={item.draft.name || "Untitled project"} index={index} total={records.length} disabled={pending || filtered}
        onMove={(direction) => {
          move(item.id, direction);
          setAnnouncement(`${item.draft.name || "Untitled project"} moved to position ${index + direction + 1} of ${records.length}.`);
        }} />}>
        <CmsRecordLink href={`/admin/projects/${item.id}`} title={item.draft.name || "Untitled project"} summary={item.draft.summary || "Add a summary to introduce this project."} metadata={item.draft.platform === "mobile" ? "Mobile" : "Web"} status={projectStatus(item)} thumbnail={item.draft.screenshot ? <div className="relative h-24 w-36 shrink-0 overflow-hidden border border-border"><Image src={item.draft.screenshot} alt={item.draft.decorative ? "" : item.draft.screenshotAlt} fill sizes="144px" className="object-cover" /></div> : null} />
      </CmsRecordRow>)}
    </ul>
    {!shown.length ? <CmsEmptyState title={records.length ? "No matching projects" : "Your first project starts here"} description={records.length ? "Try a different search or choose another status." : "Create a project to start sharing your work."} action={records.length ? <Button variant="ghost" onPress={() => { setSearch(""); setStatus("all"); }}>Clear filters</Button> : null} /> : null}
  </>;
}

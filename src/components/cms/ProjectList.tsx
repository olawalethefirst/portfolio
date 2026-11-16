"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { CmsCollectionActions } from "./CmsCollectionActions";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { useProjects } from "@/src/cms/ProjectProvider";
import {
  useProjectsQuery,
  useReorderProjects,
} from "@/src/cms/project-queries";
import { projectStatus } from "@/src/cms/projects";
import { Button } from "@/src/components/ui/Button";
import { LoadingState } from "@/src/components/ui/LoadingState";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsFeedback,
  CmsRecordRow,
  CmsRecordLink,
} from "./CmsLayout";
import { CmsOrderActions, CmsOrderHint } from "./CmsOrderActions";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";

const CollectionPreview = dynamic(
  () =>
    import("./ProjectCollectionPreview").then(
      (module) => module.ProjectCollectionPreview,
    ),
  {
    ssr: false,
    loading: () => <p role="status">Loading project section preview…</p>,
  },
);

export function ProjectList() {
  const router = useRouter();
  const { working } = useProjects();
  const { data, isPending, isError, refetch } = useProjectsQuery();
  const { reorder, pending } = useReorderProjects();
  const [announcement, setAnnouncement] = useState("");
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const [status, setStatus] = useState("all");
  const records = data ?? [];
  const filtered = Boolean(search.trim()) || status !== "all";
  const shown = records.filter(
    ({ draft, published }) =>
      `${draft.name} ${draft.summary}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (status === "all" ||
        (status === "published" ? Boolean(published) : !published)),
  );

  /** Order is whole-collection state, so every current ID is submitted. */
  function moveProject(id: string, direction: -1 | 1, label: string) {
    const order = records.map((record) => record.id);
    const from = order.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    setFailure("");
    setAnnouncement(`${label} moved to position ${to + 1} of ${order.length}.`);
    void reorder(order).catch((error: unknown) => {
      setAnnouncement("");
      setFailure(
        error instanceof Error ? error.message : "Couldn’t save the new order.",
      );
    });
  }

  if (isPending) return <LoadingState label="Loading projects" />;
  if (isError)
    return (
      <CmsEmptyState
        title="Couldn’t load projects"
        description="The list could not be read. Check your connection and try again."
        action={
          <Button variant="ghost" onPress={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  if (preview)
    return (
      <CmsPreviewFrame
        label="Project section preview"
        exitLabel="Exit project section preview"
        closeRef={closeRef}
        onExit={() => setPreview(false)}
      >
        <CollectionPreview records={records} />
      </CmsPreviewFrame>
    );
  return (
    <>
      <CmsPageHeader
        title="Projects"
        description="The work you want to share."
        action={
          <CmsCollectionActions
            collection="project"
            pending={pending}
            onNew={() => {
              working.clear("new");
              router.push("/admin/projects/new");
            }}
            onPreview={() => {
              capture("project-section-trigger");
              setPreview(true);
            }}
          />
        }
      />
      <CmsCollectionToolbar
        collection="projects"
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
      />
      <CmsFeedback>
        <p>
          {shown.length} {shown.length === 1 ? "project" : "projects"}
        </p>
        <CmsOrderHint />
      </CmsFeedback>
      {failure ? <p role="alert">{failure}</p> : null}
      <p role="status" aria-label="Project order" className="sr-only">
        {announcement}
      </p>
      <ul className="divide-y divide-border border-y border-border">
        {shown.map((item, index) => (
          <CmsRecordRow
            key={item.id}
            actions={
              <CmsOrderActions
                name={item.draft.name || "Untitled project"}
                index={index}
                total={records.length}
                disabled={pending || filtered}
                onMove={(direction) =>
                  moveProject(
                    item.id,
                    direction,
                    item.draft.name || "Untitled project",
                  )
                }
              />
            }
          >
            <CmsRecordLink
              href={`/admin/projects/${item.id}`}
              title={item.draft.name || "Untitled project"}
              summary={
                item.draft.summary || "Add a summary to introduce this project."
              }
              metadata={item.draft.platform === "mobile" ? "Mobile" : "Web"}
              status={projectStatus(item)}
              thumbnail={
                item.draft.screenshot ? (
                  <div className="relative h-24 w-36 shrink-0 overflow-hidden border border-border">
                    <Image
                      src={item.draft.screenshot}
                      alt={item.draft.screenshotAlt}
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  </div>
                ) : null
              }
            />
          </CmsRecordRow>
        ))}
      </ul>
      {!shown.length ? (
        <CmsEmptyState
          title={
            records.length
              ? "No matching projects"
              : "Your first project starts here"
          }
          description={
            records.length
              ? "Try a different search or choose another status."
              : "Create a project to start sharing your work."
          }
          action={
            records.length ? (
              <Button
                variant="ghost"
                onPress={() => {
                  setSearch("");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : null}
    </>
  );
}

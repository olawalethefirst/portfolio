"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { CmsCollectionActions } from "./CmsCollectionActions";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { useCms } from "@/src/cms/CmsProvider";
import { publicationState } from "@/src/cms/publications";
import { Button } from "@/src/components/ui/Button";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";
import { CmsEmptyState, CmsPageHeader, CmsFeedback, CmsRecordRow, CmsRecordLink } from "./CmsLayout";
import { CmsOrderActions, CmsOrderHint } from "./CmsOrderActions";

const CollectionPreview = dynamic(() => import("./PublicationCollectionPreview").then((module) => module.PublicationCollectionPreview), {
  ssr: false,
  loading: () => <p role="status">Loading publication section preview…</p>,
});

export function PublicationList() {
  const { records, move, pending, working } = useCms();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const [status, setStatus] = useState("all");
  const filtered = Boolean(search.trim()) || status !== "all";
  const shown = records.filter((item) => {
    const match = `${item.draft.title} ${item.draft.summary}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return (
      match &&
      (status === "all" ||
        (status === "published" ? Boolean(item.published) : !item.published))
    );
  });
  if (preview) return <CmsPreviewFrame label="Publication section preview" exitLabel="Exit publication section preview" closeRef={closeRef} onExit={() => setPreview(false)}><CollectionPreview records={records} /></CmsPreviewFrame>;
  return (
    <>
      <CmsPageHeader title="Publications" description="Ideas, observations, and work worth sharing. Start a draft or return to a story." action={<CmsCollectionActions collection="publication" pending={pending} onNew={() => { working.clear("new"); router.push("/admin/publications/new"); }} onPreview={() => { capture("publication-section-trigger"); setPreview(true); }} />} />
      <CmsCollectionToolbar collection="publications" search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />
      <CmsFeedback><p>{shown.length} {shown.length === 1 ? "publication" : "publications"}</p><CmsOrderHint /></CmsFeedback>
      <p role="status" aria-label="Publication order" className="sr-only">{announcement}</p>
      {shown.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((item, index) => (
            <CmsRecordRow key={item.id} actions={<CmsOrderActions
              name={item.draft.title.trim() || "Untitled publication"} index={index} total={records.length} disabled={pending || filtered}
              onMove={(direction) => {
                move(item.id, direction);
                setAnnouncement(`${item.draft.title.trim() || "Untitled publication"} moved to position ${index + direction + 1} of ${records.length}.`);
              }} />}>

              <CmsRecordLink href={`/admin/publications/${item.id}`} title={item.draft.title.trim() || "Untitled publication"} summary={item.draft.summary || "Add a summary to introduce this publication."} metadata={<><span>Article</span><time dateTime={item.draft.publishedOn || undefined}>{item.draft.publishedOn || "Undated draft"}</time></>} status={publicationState(item)} />
            </CmsRecordRow>
          ))}
        </ul>
      ) : (
        <CmsEmptyState title={records.length ? "No matching publications" : "Your first story starts here"} description={records.length ? "Try a different search or choose another status." : "Create a publication to start writing."} action={records.length ? <Button variant="ghost" onPress={() => { setSearch(""); setStatus("all"); }}>Clear filters</Button> : null} />
      )}
    </>
  );
}

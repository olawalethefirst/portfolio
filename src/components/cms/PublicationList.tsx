"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { CmsCollectionActions } from "./CmsCollectionActions";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { useCms } from "@/src/cms/CmsProvider";
import {
  usePublicationsQuery,
  useReorderPublications,
} from "@/src/cms/publication-queries";
import { publicationState } from "@/src/cms/publications";
import { Button } from "@/src/components/ui/Button";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsFeedback,
  CmsRecordRow,
  CmsRecordLink,
} from "./CmsLayout";
import { CmsOrderActions, CmsOrderHint } from "./CmsOrderActions";

const CollectionPreview = dynamic(
  () =>
    import("./PublicationCollectionPreview").then(
      (module) => module.PublicationCollectionPreview,
    ),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading publication section preview" />,
  },
);

export function PublicationList() {
  const router = useRouter();
  const { working } = useCms();
  const { data, isPending, isError, refetch } = usePublicationsQuery();
  const { reorder, pending } = useReorderPublications();
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [failure, setFailure] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const [status, setStatus] = useState("all");
  const records = data ?? [];
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

  /** Order is whole-collection state, so every current ID is submitted. */
  function movePublication(id: string, direction: -1 | 1, label: string) {
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

  if (isPending) return <LoadingState label="Loading publications" />;
  if (isError)
    return (
      <CmsEmptyState
        title="Couldn’t load publications"
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
        label="Publication section preview"
        exitLabel="Exit publication section preview"
        closeRef={closeRef}
        onExit={() => setPreview(false)}
      >
        <CollectionPreview records={records} />
      </CmsPreviewFrame>
    );
  return (
    <>
      <CmsPageHeader
        title="Publications"
        description="Ideas, observations, and work worth sharing. Start a draft or return to a story."
        action={
          <CmsCollectionActions
            collection="publication"
            pending={pending}
            onNew={() => {
              working.clear("new");
              router.push("/admin/publications/new");
            }}
            onPreview={() => {
              capture("publication-section-trigger");
              setPreview(true);
            }}
          />
        }
      />
      <CmsCollectionToolbar
        collection="publications"
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
      />
      <CmsFeedback>
        <p>
          {shown.length} {shown.length === 1 ? "publication" : "publications"}
        </p>
        <CmsOrderHint />
      </CmsFeedback>
      {failure ? <p role="alert">{failure}</p> : null}
      <p role="status" aria-label="Publication order" className="sr-only">
        {announcement}
      </p>
      {shown.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((item, index) => (
            <CmsRecordRow
              key={item.id}
              actions={
                <CmsOrderActions
                  name={item.draft.title.trim() || "Untitled publication"}
                  index={index}
                  total={records.length}
                  disabled={pending || filtered}
                  onMove={(direction) =>
                    movePublication(
                      item.id,
                      direction,
                      item.draft.title.trim() || "Untitled publication",
                    )
                  }
                />
              }
            >
              <CmsRecordLink
                href={`/admin/publications/${item.id}`}
                title={item.draft.title.trim() || "Untitled publication"}
                summary={
                  item.draft.summary ||
                  "Add a summary to introduce this publication."
                }
                metadata={
                  <>
                    <span>Article</span>
                    <time dateTime={item.draft.publishedOn || undefined}>
                      {item.draft.publishedOn || "Undated draft"}
                    </time>
                  </>
                }
                status={publicationState(item)}
              />
            </CmsRecordRow>
          ))}
        </ul>
      ) : (
        <CmsEmptyState
          title={
            records.length
              ? "No matching publications"
              : "Your first story starts here"
          }
          description={
            records.length
              ? "Try a different search or choose another status."
              : "Create a publication to start writing."
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
      )}
    </>
  );
}

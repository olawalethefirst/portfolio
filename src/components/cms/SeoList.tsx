"use client";

import { Plus, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSeoQuery } from "@/src/cms/seo-queries";
import { resolveSeo } from "@/src/cms/seo";
import { Button } from "@/src/components/ui/Button";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";
import {
  CmsEmptyState,
  CmsFeedback,
  CmsPageHeader,
  CmsRecordLink,
  CmsRecordRow,
} from "./CmsLayout";

export function SeoList() {
  const router = useRouter();
  const { data, error } = useSeoQuery();
  const defaults = data?.find((record) => record.path === "/");
  const records = data?.filter((record) => record.path !== "/") ?? [];
  const unavailable = !defaults || Boolean(error);
  const [search, setSearch] = useState("");
  const shown = records.filter((record) =>
    `${record.path} ${record.title} ${record.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const header = (
    <CmsPageHeader
      title="SEO"
      description="Paths without an override use global defaults."
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            isDisabled={unavailable}
            startContent={<Settings2 aria-hidden="true" className="size-4" />}
            onPress={() => router.push("/admin/seo/defaults")}
          >
            Edit defaults
          </Button>
          <Button
            isDisabled={unavailable}
            startContent={<Plus aria-hidden="true" className="size-4" />}
            onPress={() => router.push("/admin/seo/new")}
          >
            New override
          </Button>
        </div>
      }
    />
  );
  if (!data)
    return (
      <>
        {header}
        {error ? (
          <CmsFeedback error="Couldn’t load saved SEO content.">
            {null}
          </CmsFeedback>
        ) : (
          <LoadingState label="Loading SEO" />
        )}
      </>
    );
  if (!defaults || error)
    return (
      <>
        {header}
        <CmsFeedback
          error={
            error
              ? "Couldn’t load saved SEO content."
              : "The saved SEO defaults are unavailable."
          }
        >
          {null}
        </CmsFeedback>
      </>
    );
  return (
    <>
      {header}
      <CmsCollectionToolbar
        collection="seo"
        search={search}
        onSearchChange={setSearch}
      />
      <CmsFeedback>
        {shown.length} {shown.length === 1 ? "path" : "paths"}
      </CmsFeedback>
      {shown.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((record) => {
            const effective = resolveSeo(defaults, record);
            return (
              <CmsRecordRow key={record.id}>
                <CmsRecordLink
                  href={`/admin/seo/${record.id}`}
                  title={record.path}
                  summary={effective.description || "No effective description."}
                  metadata={
                    <>Effective title: {effective.title || "Not set"}</>
                  }
                />
              </CmsRecordRow>
            );
          })}
        </ul>
      ) : (
        <CmsEmptyState
          title={
            records.length
              ? "No matching SEO overrides"
              : "No SEO overrides yet"
          }
          description={
            records.length
              ? "Try a different path or override text."
              : "Create a path override, or edit defaults to apply across the site."
          }
          action={
            records.length ? (
              <Button
                variant="ghost"
                onPress={() => {
                  setSearch("");
                }}
              >
                Clear search
              </Button>
            ) : undefined
          }
        />
      )}
    </>
  );
}

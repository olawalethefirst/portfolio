"use client";

import { Plus, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSeo } from "@/src/cms/SeoProvider";
import { resolveSeo } from "@/src/cms/seo";
import { Button } from "@/src/components/ui/Button";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";
import { CmsEmptyState, CmsFeedback, CmsPageHeader, CmsRecordLink, CmsRecordRow } from "./CmsLayout";
import { CmsShell } from "./CmsShell";

export function SeoList() {
  const router = useRouter();
  const { saved, pending } = useSeo();
  const [search, setSearch] = useState("");
  const shown = saved.records.filter((record) => `${record.path} ${record.title} ${record.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <CmsShell section="seo" onPublications={() => router.push("/admin/publications")}>
    <CmsPageHeader title="SEO" description="Paths without an override use global defaults. Changes are demo-only." action={<div className="flex flex-wrap gap-2">
      <Button variant="outline" isDisabled={pending} startContent={<Settings2 aria-hidden="true" className="size-4" />} onPress={() => router.push("/admin/seo/defaults")}>Edit defaults</Button>
      <Button isDisabled={pending} startContent={<Plus aria-hidden="true" className="size-4" />} onPress={() => router.push("/admin/seo/new")}>New override</Button>
    </div>} />
    <CmsCollectionToolbar collection="seo" search={search} onSearchChange={setSearch} />
    <CmsFeedback>{shown.length} {shown.length === 1 ? "path" : "paths"}</CmsFeedback>
    {shown.length ? <ul className="divide-y divide-border border-y border-border">{shown.map((record) => {
      const effective = resolveSeo(saved.defaults, record);
      return <CmsRecordRow key={record.id}><CmsRecordLink href={`/admin/seo/${record.id}`} title={record.path} summary={effective.description || "No effective description."} metadata={<>Effective title: {effective.title || "Not set"}</>} /></CmsRecordRow>;
    })}</ul> : <CmsEmptyState title={saved.records.length ? "No matching SEO overrides" : "No SEO overrides yet"} description={saved.records.length ? "Try a different path or override text." : "Create a path override, or edit defaults to apply across the site."} action={saved.records.length ? <Button variant="ghost" onPress={() => { setSearch(""); }}>Clear search</Button> : undefined} />}
  </CmsShell>;
}

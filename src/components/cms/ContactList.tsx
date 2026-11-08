"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSocial } from "@/src/cms/SocialProvider";
import { SocialProfileIcon } from "@/src/components/contact-conversation/SocialLinks";
import { Button } from "@/src/components/ui/Button";
import { CmsCollectionActions } from "./CmsCollectionActions";
import { CmsCollectionToolbar } from "./CmsCollectionToolbar";
import { CmsEmptyState, CmsFeedback, CmsPageHeader, CmsRecordLink, CmsRecordRow } from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsShell } from "./CmsShell";
const ContactPreview = dynamic(() => import("./ContactPreview").then((module) => module.ContactPreview), { ssr: false, loading: () => <p role="status">Loading contact preview…</p> });
export function ContactList() {
  const router = useRouter();
  const { records, pending } = useSocial();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const shown = records.filter((record) => `${record.name} ${record.url}`.toLowerCase().includes(search.trim().toLowerCase()));
  if (preview) return <CmsPreviewFrame label="Contact preview" exitLabel="Exit preview" closeRef={closeRef} onExit={() => setPreview(false)}><ContactPreview records={records} /></CmsPreviewFrame>;
  return <CmsShell section="contact">
    <CmsPageHeader title="Contact" description="Manage the profile links and images shown beside your contact form." action={<CmsCollectionActions collection="contact" pending={pending} onNew={() => router.push("/admin/contact/new")} onPreview={() => { capture("contact-section-trigger"); setPreview(true); }} />} />
    <CmsCollectionToolbar collection="contact" search={search} onSearchChange={setSearch} />
    <CmsFeedback>{shown.length} {shown.length === 1 ? "profile" : "profiles"}</CmsFeedback>
    {shown.length ? <ul className="divide-y divide-border border-y border-border">{shown.map((record) => <CmsRecordRow key={record.id}>
      <CmsRecordLink href={`/admin/contact/${record.id}`} title={record.name} summary={record.url} metadata={record.imageSrc ? "Uploaded image" : "Built-in logo"} thumbnail={<div className="flex size-16 shrink-0 items-center justify-center border border-border text-accent"><SocialProfileIcon profile={{ id: record.id, label: record.name, imageSrc: record.imageSrc || undefined, icon: record.icon }} /></div>} />
    </CmsRecordRow>)}</ul> : <CmsEmptyState title={records.length ? "No matching contact profiles" : "No contact profiles yet"} description={records.length ? "Try a different name or URL." : "Create a profile to add a link and image to the contact preview."} action={records.length ? <Button variant="ghost" onPress={() => setSearch("")}>Clear search</Button> : undefined} />}
  </CmsShell>;
}

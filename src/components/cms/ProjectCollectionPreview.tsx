"use client";

import type { ProjectRecord } from "@/src/cms/projects";
import { ProjectsSection } from "@/src/components/home-sections/ProjectsSection";
import { CmsEmptyState } from "./CmsLayout";
import { CmsPreviewLinks } from "./CmsPreviewLinks";
import { ProjectPreviewBoundary } from "./ProjectPreview";

export function ProjectCollectionPreview({ records }: { records: readonly ProjectRecord[] }) {
  const projects = records.flatMap(({ id, published }) => published ? [{
    id: `cms-${id}`,
    name: published.name,
    summary: published.summary,
    what: published.what,
    how: published.how,
    platform: published.platform,
    liveHref: published.liveUrl,
    screenTextureSrc: published.screenshot || undefined,
  }] : []);
  return <CmsPreviewLinks>
    <ProjectPreviewBoundary><ProjectsSection projects={projects} emptyState={<CmsEmptyState title="No published projects" description="Publish a project to preview it in this section." />} /></ProjectPreviewBoundary>
  </CmsPreviewLinks>;
}

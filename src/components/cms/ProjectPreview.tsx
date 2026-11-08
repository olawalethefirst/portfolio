"use client";

import { Component, type ReactNode, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ProjectDraft } from "@/src/cms/projects";
import { httpsUrl } from "@/src/cms/publications";
import { ProjectItem } from "@/src/components/project-item/ProjectItem";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";

export class ProjectPreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="alert" className="border border-border p-6">The device preview could not load. Your edits are safe. Close and reopen preview to try again.</p>
      : this.props.children;
  }
}

export function ProjectPreview({ value }: { value: ProjectDraft }) {
  const [openLink, setOpenLink] = useState(false);
  const validLink = httpsUrl(value.liveUrl);
  const incomplete = !value.name.trim() || !value.summary.trim() || !value.what.trim() || !value.how.trim() || !value.screenshot;
  return <>
    {incomplete ? <p role="status" className="mb-4 text-sm text-muted">Missing content uses preview placeholders and an untextured device. These are not saved.</p> : null}
    {!validLink ? <p className="mb-4 text-sm text-muted">Add a complete HTTPS live URL in the editor to open the project.</p> : null}
    {!value.decorative && value.screenshotAlt ? <p className="sr-only">{value.screenshotAlt}</p> : null}
    <div onClickCapture={(event) => {
      if (!(event.target as Element).closest("a")) return;
      event.preventDefault();
      if (validLink) setOpenLink(true);
    }} onAuxClick={(event) => {
      if ((event.target as Element).closest("a")) event.preventDefault();
    }}>
      <ProjectPreviewBoundary>
        <ProjectItem
          id="cms-project-preview"
          name={value.name.trim() || "Untitled project"}
          summary={value.summary.trim() || "Your project summary will appear here."}
          what={value.what.trim() || "Describe what you built."}
          how={value.how.trim() || "Describe how you built it."}
          platform={value.platform}
          screenTextureSrc={value.screenshot || undefined}
          liveHref={validLink ? value.liveUrl : "#"}
          stackIndex={0}
          className="relative"
        />
      </ProjectPreviewBoundary>
    </div>
    <CmsDialog open={openLink} onClose={() => setOpenLink(false)} title="Open this link?" actions={<>
      <Button variant="ghost" onPress={() => setOpenLink(false)}>Stay in preview</Button>
      <Button href={value.liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpenLink(false)}
        endContent={<ArrowUpRight aria-hidden="true" className="size-4" />}>Open link</Button>
    </>}>
      <p>The project opens in a new tab. Your edits stay here.</p>
      <p className="mt-2 break-all">{value.liveUrl}</p>
    </CmsDialog>
  </>;
}

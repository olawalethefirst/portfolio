"use client";

import type { ReactNode } from "react";
import { ProjectItem, type ProjectItemProps } from "@/src/components/project-item";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { SectionHeading } from "@/src/components/ui/SectionHeading";

export function ProjectsSection({ projects, emptyState }: { projects: readonly Omit<ProjectItemProps, "stackIndex">[]; emptyState?: ReactNode }) {
  return <section aria-labelledby="projects-heading" className="relative isolate bg-surface text-foreground">
    <SectionContainer><SectionHeading id="projects-heading">Projects</SectionHeading></SectionContainer>
    {!projects.length ? emptyState : null}
    {projects.map((project, index) => <ProjectItem {...project} key={project.id} stackIndex={index + 1} />)}
    <div aria-hidden="true" className="h-[25dvh]" />
  </section>;
}

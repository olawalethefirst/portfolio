"use client";

import { ArrowUpRight } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { SectionContainer } from "../ui/SectionContainer";
import { cn } from "../ui/utils";
import {
  ProjectDeviceStage,
  type ModelEntryRotation,
  type ProjectPlatform,
} from "./ProjectDeviceStage";

export interface ProjectItemProps {
  id: string;
  name: string;
  summary: string;
  platform: ProjectPlatform;
  solutions: readonly string[];
  liveHref: string;
  screenTextureSrc?: string;
  modelEntryRotation?: ModelEntryRotation;
  stackIndex: number;
  className?: string;
}

export type { ProjectPlatform } from "./ProjectDeviceStage";

const platformLabels: Record<ProjectPlatform, string> = {
  mobile: "Mobile",
  web: "Web",
};

export function ProjectItem({
  id,
  name,
  summary,
  platform,
  solutions,
  liveHref,
  screenTextureSrc,
  modelEntryRotation,
  stackIndex,
  className,
}: ProjectItemProps) {
  const titleId = `${id}-title`;
  const articleRef = useRef<HTMLElement>(null);
  const isVisible = useInView(articleRef, { amount: 0.7, once: false });
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "sticky top-0 min-h-dvh overflow-hidden bg-surface text-foreground [--project-edge-clearance:4.5rem]",
        className,
      )}
      ref={articleRef}
      style={{ zIndex: stackIndex }}
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <SectionContainer className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4 pt-[calc(var(--project-edge-clearance)+env(safe-area-inset-top))] sm:gap-8">
          <header className="max-w-[32rem]">
            <h2
              className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
              id={titleId}
            >
              {name}
            </h2>
            <p className="mt-2 max-w-[42ch] text-sm leading-6 text-muted sm:text-base sm:leading-7">
              {summary}
            </p>
          </header>

          <div className="justify-self-end">
            <Chip color="accent" variant="soft">
              {platformLabels[platform]}
            </Chip>
          </div>
        </SectionContainer>
      </div>

      <div className="pointer-events-none absolute inset-0 z-0">
        <SectionContainer className="h-full">
          <ProjectDeviceStage
            className="h-full w-full"
            isVisible={isVisible}
            modelEntryRotation={modelEntryRotation}
            name={name}
            platform={platform}
            reduceMotion={reduceMotion}
            screenTextureSrc={screenTextureSrc}
          />
        </SectionContainer>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <SectionContainer className="grid grid-cols-2 items-end gap-4 pb-[calc(var(--project-edge-clearance)+env(safe-area-inset-bottom))] sm:gap-8">
          <ul
            aria-label={`${name} solutions`}
            className="flex max-w-[28rem] flex-wrap content-end gap-1"
          >
            {solutions.map((solution) => (
              <li key={solution}>
                <Chip size="sm" variant="soft">
                  {solution}
                </Chip>
              </li>
            ))}
          </ul>

          <Button
            aria-label={`View ${name} live`}
            className="min-h-11 justify-self-end"
            endContent={<ArrowUpRight aria-hidden="true" />}
            href={liveHref}
            rel="noreferrer"
            size="md"
            target="_blank"
            variant="outline"
          >
            View project
          </Button>
        </SectionContainer>
      </div>
    </article>
  );
}

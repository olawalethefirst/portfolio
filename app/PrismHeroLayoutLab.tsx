"use client";

import { useRef } from "react";

import { AboutCtaSection } from "@/src/components/about-cta/AboutCtaSection";
import type { AboutContent } from "@/src/components/about-cta/about-content";
import type { PublishedProject } from "@/src/cms/projects";
import { ProjectsSection } from "@/src/components/home-sections/ProjectsSection";
import { PublicationsSection } from "@/src/components/home-sections/PublicationsSection";
import {
  PrismHeroLayout,
  type PrismHeroLayoutHandle,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";
import type { PrismHeroContent } from "@/src/components/prism-fiber/ui/hero/prism-hero-content";
import { Surface } from "@/src/components/ui/Surface";

import { LabThemeShell } from "./LabThemeShell";

import { usePrismDiscoveryScroll } from "./usePrismDiscoveryScroll";
import { labPublications } from "./lab-publications";

export function PrismHeroLayoutLab({
  content,
  about,
  projects,
}: {
  content: PrismHeroContent;
  about: AboutContent;
  projects: readonly PublishedProject[];
}) {
  const heroRef = useRef<PrismHeroLayoutHandle>(null);
  const scrollOriginRef = usePrismDiscoveryScroll(heroRef);
  const projectItems = projects.map((project) => ({
    id: project.id,
    name: project.name,
    summary: project.summary,
    platform: project.platform,
    what: project.what,
    how: project.how,
    liveHref: project.liveUrl,
    screenTextureSrc: project.screenshot || undefined,
  }));

  return (
    <LabThemeShell>
      {(navigation) => (
        <main
          className="relative isolate min-h-dvh bg-surface font-sans text-foreground"
          id="layout-review"
        >
          <div
            ref={scrollOriginRef}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 size-px"
          />

          <section
            aria-label="Prism scroll discovery"
            className="sticky top-0 z-0 h-[200dvh] w-full"
            data-testid="prism-scroll-runway"
          >
            <div className="sticky top-0 h-dvh w-full">
              <PrismHeroLayout
                content={content}
                ref={heroRef}
                allowsCameraZoom={false}
              />
            </div>
          </section>

          <Surface
            className="relative z-10 min-h-dvh w-full"
            data-testid="prism-glass-panel"
            material="glass"
          >
            <div className="grid">
              <div className="min-w-0 [grid-area:1/1]">
                <ProjectsSection projects={projectItems} />
                <PublicationsSection publications={labPublications} />
                <AboutCtaSection
                  heading={about.heading}
                  summary={about.biography}
                />
              </div>
              <div className="pointer-events-none relative z-20 min-h-0 [grid-area:1/1]">
                <div
                  aria-hidden="true"
                  className="h-[calc(100dvh-var(--navigation-bottom-offset))]"
                />
                <div className="sticky top-[calc(100dvh-var(--navigation-bottom-offset))] h-0">
                  <div className="absolute inset-x-0 bottom-0">
                    {navigation}
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </main>
      )}
    </LabThemeShell>
  );
}

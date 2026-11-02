"use client";

import { useRef } from "react";

import { AboutCtaSection } from "@/src/components/about-cta/AboutCtaSection";
import { ProjectItem } from "@/src/components/project-item";
import { labProjects } from "@/src/components/project-item/lab-projects";
import { PublicationCard } from "@/src/components/publication-card";
import {
  PrismHeroLayout,
  type PrismHeroLayoutHandle,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { Surface } from "@/src/components/ui/Surface";

import { LabThemeShell } from "./LabThemeShell";

import { usePrismDiscoveryScroll } from "./usePrismDiscoveryScroll";
import { labPublications } from "./lab-publications";

export function PrismHeroLayoutLab() {
  const heroRef = useRef<PrismHeroLayoutHandle>(null);
  const scrollOriginRef = usePrismDiscoveryScroll(heroRef);

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
              <PrismHeroLayout ref={heroRef} allowsCameraZoom={false} />
            </div>
          </section>

          <Surface
            className="relative z-10 min-h-dvh w-full"
            data-testid="prism-glass-panel"
            material="glass"
          >
            <div className="grid">
              <div className="min-w-0 [grid-area:1/1]">
                <section aria-labelledby="projects-heading" className="relative isolate bg-surface text-foreground">
                  <SectionContainer>
                    <SectionHeading id="projects-heading">Projects</SectionHeading>
                  </SectionContainer>
                  {labProjects.map((project, index) => (
                    <ProjectItem
                      {...project}
                      key={project.id}
                      stackIndex={index + 1}
                    />
                  ))}
                  <div aria-hidden="true" className="h-[25dvh]" />
                </section>
                <section
                  aria-labelledby="publications-heading"
                  className="relative -mb-[100dvh] text-foreground"
                >
                  <SectionContainer>
                    <SectionHeading id="publications-heading">Publications</SectionHeading>
                    <div className="grid auto-rows-fr grid-cols-1 gap-6 pb-[calc(100dvh+5rem)] lg:grid-cols-2 lg:gap-8 sm:pb-[calc(100dvh+6rem)]">
                      {labPublications.map((publication) => (
                        <PublicationCard
                          {...publication}
                          className="sticky top-5"
                          key={publication.href}
                        />
                      ))}
                    </div>
                  </SectionContainer>
                </section>
                <AboutCtaSection />
              </div>
              <div className="pointer-events-none relative z-20 min-h-0 [grid-area:1/1]">
                <div aria-hidden="true" className="h-[calc(100dvh-0.5rem)]" />
                <div className="sticky top-[calc(100dvh-0.5rem)] h-0">
                  <div className="absolute inset-x-0 bottom-0">{navigation}</div>
                </div>
              </div>
            </div>
          </Surface>
        </main>
      )}
    </LabThemeShell>
  );
}

import type { Metadata } from "next";
import { AboutCtaSection } from "@/src/components/about-cta/AboutCtaSection";
import { PublicationComments } from "@/src/components/publication-comments/PublicationComments";

import { PublicationDetails } from "@/src/components/publication-details";
import { samplePublication } from "@/src/components/publication-details/sample-publication";

import { LabThemeShell } from "../LabThemeShell";
import { PublicationDetailsLabActionBar } from "./PublicationDetailsLabActionBar";
import { sampleComments } from "./sample-comments";

export const metadata: Metadata = {
  description:
    "A publication details layout lab for long-form, Markdown-authored writing.",
  title: "Publication Details Lab",
};

export default function PublicationDetailsLabPage() {
  return (
    <LabThemeShell>
      <main className="relative min-h-screen bg-surface">
        <div className="pointer-events-none fixed inset-x-0 top-8 z-10 mx-auto w-full max-w-6xl px-5  sm:px-8 lg:px-12">
          <PublicationDetailsLabActionBar className="pointer-events-auto" />
        </div>
        <PublicationDetails publication={samplePublication} />
        <PublicationComments initialThreads={sampleComments} />
      </main>
      <footer>
        <AboutCtaSection />
      </footer>
    </LabThemeShell>
  );
}

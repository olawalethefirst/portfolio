import { cache } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AboutCtaSection } from "@/src/components/about-cta/AboutCtaSection";
import { PublicationDetails } from "@/src/components/publication-details";
import {
  publicationTags,
  readingTimeMinutes,
} from "@/src/cms/publications";
import { readPublication } from "@/src/db/publications";

import { LabThemeShell } from "../../LabThemeShell";
import { PublicationActionBar } from "./PublicationActionBar";

const loadPublished = cache(async (id: string) => {
  const record = await readPublication(id);
  return record?.published ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const published = await loadPublished(id);
  if (!published) return { title: "Publication not found" };
  return { title: published.title, description: published.summary };
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const published = await loadPublished(id);
  if (!published) notFound();

  return (
    <LabThemeShell>
      <main className="relative min-h-screen bg-surface">
        <div className="pointer-events-none fixed inset-x-0 top-8 z-10 mx-auto w-full max-w-6xl px-5  sm:px-8 lg:px-12">
          <PublicationActionBar className="pointer-events-auto" />
        </div>
        <PublicationDetails
          publication={{
            title: published.title,
            bodyMarkdown: published.bodyMarkdown,
            cover: { src: published.coverSrc, alt: published.coverAlt },
            publishedAt: published.publishedOn,
            readingTimeMinutes: readingTimeMinutes(published.bodyMarkdown),
            tags: publicationTags(published.tagsText),
          }}
        />
      </main>
      <footer>
        <AboutCtaSection />
      </footer>
    </LabThemeShell>
  );
}

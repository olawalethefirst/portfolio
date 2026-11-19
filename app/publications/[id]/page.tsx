import { cache } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AboutCtaSection } from "@/src/components/about-cta/AboutCtaSection";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { PublicationDetails } from "@/src/components/publication-details";
import {
  publicationTags,
  readingTimeMinutes,
} from "@/src/cms/publications";
import { toCommentThreads } from "@/src/cms/publication-comments";
import { QueryProvider } from "@/src/api/QueryProvider";
import { PublicationComments } from "@/src/components/publication-comments/PublicationComments";
import { listPublicationComments } from "@/src/db/publication-comments";
import { readPublication } from "@/src/db/publications";

import { LabThemeShell } from "../../LabThemeShell";
import { HeaderActionBar } from "@/src/components/ui/header-action-bar";

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
  // Initial comments are server-rendered; posting and refresh use the public API.
  const threads = toCommentThreads(await listPublicationComments(id));

  return (
    <LabThemeShell>
      <main className="relative min-h-screen bg-surface">
        <SectionContainer className="pointer-events-none fixed inset-x-0 top-8 z-10">
          <HeaderActionBar buttonClassName="pointer-events-auto" />
        </SectionContainer>
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
        <QueryProvider>
          <PublicationComments publicationId={id} initialThreads={threads} />
        </QueryProvider>
      </main>
      <footer>
        <AboutCtaSection />
      </footer>
    </LabThemeShell>
  );
}

import Image from "next/image";

import { Chip } from "@/src/components/ui/Chip";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { Surface } from "@/src/components/ui/Surface";

import { ReadingProgress } from "./ReadingProgress";
import { PublicationTableOfContents } from "./PublicationTableOfContents";
import { PublicationMarkdown } from "./PublicationMarkdown";
import { getPublicationHeadings } from "./publication-headings";

export interface PublicationDetailsData {
  bodyMarkdown: string;
  cover: {
    alt: string;
    src: string;
  };
  publishedAt: string;
  readingTimeMinutes: number;
  tags: readonly string[];
  title: string;
}

export interface PublicationDetailsProps {
  publication: PublicationDetailsData;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function PublicationDetails({ publication }: PublicationDetailsProps) {
  const headings = getPublicationHeadings(publication.bodyMarkdown);
  const formattedDate = dateFormatter.format(
    new Date(`${publication.publishedAt}T00:00:00Z`),
  );

  return (
    <article
      aria-labelledby="publication-title"
      className="w-full"
    >
      <ReadingProgress />

      <div
        className="relative h-[max(220px,30svh)] w-full overflow-hidden"
      >
        <Image
          alt={publication.cover.alt}
          className="object-cover"
          fill
          sizes="100vw"
          src={publication.cover.src}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/95 via-black/35 to-transparent"
        />
        <SectionContainer className="absolute inset-x-0 bottom-0 pb-8">
          <h1
            className="w-full text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
            id="publication-title"
          >
            {publication.title}
          </h1>
        </SectionContainer>
      </div>

      <Surface className="w-full bg-transparent" variant="elevated">
        <SectionContainer className="pt-10 pb-12 sm:pt-14 sm:pb-16">
          <header className="w-full">
            <ul aria-label="Topics" className="flex flex-wrap gap-2">
              {publication.tags.map((tag) => (
                <li key={tag}>
                  <Chip color="accent" variant="soft" size="sm">
                    {tag}
                  </Chip>
                </li>
              ))}
            </ul>

            <p className="mt-6 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <time dateTime={publication.publishedAt}>{formattedDate}</time>
              <span aria-hidden="true">·</span>
              <span>{publication.readingTimeMinutes} min read</span>
            </p>
          </header>

          <div className={`mt-14 grid min-w-0 gap-10 sm:mt-16 ${headings.length ? "lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12" : ""}`}>
            <PublicationTableOfContents headings={headings} />
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <PublicationMarkdown>{publication.bodyMarkdown}</PublicationMarkdown>
            </div>
          </div>
        </SectionContainer>
      </Surface>
    </article>
  );
}

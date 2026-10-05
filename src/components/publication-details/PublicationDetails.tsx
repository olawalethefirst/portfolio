import { Typography } from "@heroui/react/typography";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { PUBLICATION_COVER_ASPECT_CLASS } from "@/src/components/publication-cover";
import { Chip } from "@/src/components/ui/Chip";
import { Surface } from "@/src/components/ui/Surface";

import { ReadingProgress } from "./ReadingProgress";

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
  const formattedDate = dateFormatter.format(
    new Date(`${publication.publishedAt}T00:00:00Z`),
  );

  return (
    <article
      aria-labelledby="publication-title"
      className="mx-auto w-full max-w-6xl"
    >
      <ReadingProgress />

      <Surface
        className="overflow-hidden rounded-2xl ring-1 ring-border"
        variant="elevated"
      >
        <div
          className={`relative w-full ${PUBLICATION_COVER_ASPECT_CLASS} overflow-hidden`}
        >
          <Image
            alt={publication.cover.alt}
            className="object-cover"
            fill
            sizes="(max-width: 1023px) calc(100vw - 2.5rem), 72rem"
            src={publication.cover.src}
          />
        </div>

        <div className="w-full px-5 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-16 lg:px-16">
          <header className="w-full">
            <h1
              className="w-full text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
              id="publication-title"
            >
              {publication.title}
            </h1>

            <ul aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
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

          <Typography.Prose className="mt-14 flex w-full max-w-none flex-col gap-5 sm:mt-16">
            <Markdown remarkPlugins={[remarkGfm]}>
              {publication.bodyMarkdown}
            </Markdown>
          </Typography.Prose>
        </div>
      </Surface>
    </article>
  );
}

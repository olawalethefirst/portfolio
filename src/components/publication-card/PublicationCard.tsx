import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PUBLICATION_COVER_ASPECT_CLASS } from "@/src/components/publication-cover";
import { Chip } from "@/src/components/ui/Chip";
import { Surface } from "@/src/components/ui/Surface";

export interface PublicationCardProps {
  cover: {
    alt: string;
    src: string;
  };
  date: string;
  href: string;
  summary: string;
  tags: readonly string[];
  title: string;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function PublicationCard({
  cover,
  date,
  href,
  summary,
  tags,
  title,
}: PublicationCardProps) {
  const formattedDate = dateFormatter.format(new Date(`${date}T00:00:00Z`));

  return (
    <article aria-label={title} className="h-full">
      <Surface
        className="group h-full overflow-hidden rounded-2xl text-surface-foreground"
        material="glass"
      >
        <Link
          aria-label={`Read ${title}`}
          className="grid h-full grid-rows-[auto_1fr] rounded-2xl transition-opacity duration-200 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset motion-reduce:transition-none"
          href={href}
        >
          <div
            className={`${PUBLICATION_COVER_ASPECT_CLASS} overflow-hidden rounded-xl ring-1 ring-border`}
          >
            <div className="relative size-full transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none">
              <Image
                alt={cover.alt}
                className="object-cover"
                fill
                sizes="(max-width: 1023px) calc(100vw - 3.5rem), 40rem"
                src={cover.src}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col p-6 sm:p-8">
            <time
              className="text-xs font-medium tracking-[0.14em] text-muted uppercase"
              dateTime={date}
            >
              {formattedDate}
            </time>

            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Topics">
              {tags.map((tag) => (
                <li key={tag}>
                  <Chip size="sm" color="accent">
                    {tag}
                  </Chip>
                </li>
              ))}
            </ul>

            <h2 className="mt-6 max-w-xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>

            <p className="mt-4 max-w-xl text-pretty leading-7 text-muted">
              {summary}
            </p>

            <span className="mt-auto flex items-center gap-2 pt-8 text-sm font-semibold text-surface-foreground">
              Read publication
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </span>
          </div>
        </Link>
      </Surface>
    </article>
  );
}

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
    <article aria-label={title} className="@container/publication h-full min-w-0">
      <Surface
        className="group h-full overflow-hidden rounded-2xl text-surface-foreground"
        variant="secondary"
      >
        <Link
          aria-label={`Read ${title}`}
          className="grid h-full grid-cols-1 grid-rows-[repeat(2,minmax(0,1fr))] rounded-2xl transition-opacity duration-200 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset motion-reduce:transition-none @min-[550px]/publication:grid-cols-2 @min-[550px]/publication:grid-rows-[auto]"
          href={href}
        >
          <div
            className="grid min-h-0 min-w-0 p-4"
          >
            <div className="relative min-h-0 min-w-0 overflow-hidden rounded-xl">
              <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none">
                <Image
                  alt={cover.alt}
                  className="object-cover"
                  fill
                  sizes="(max-width: 1023px) calc(100vw - 3.5rem), 40rem"
                  src={cover.src}
                />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col p-4">
            <time
              className="text-xs font-medium tracking-[0.14em] text-muted uppercase"
              dateTime={date}
            >
              {formattedDate}
            </time>

            <ul className="mt-2.5 flex flex-wrap gap-2 @min-[550px]/publication:mt-5" aria-label="Topics">
              {tags.map((tag) => (
                <li key={tag}>
                  <Chip size="md" color="accent" variant="soft">
                    {tag}
                  </Chip>
                </li>
              ))}
            </ul>

            <h2 className="mt-3 max-w-xl text-balance text-xl leading-7 font-semibold tracking-tight @min-[640px]/publication:text-2xl @min-[640px]/publication:leading-8 @min-[550px]/publication:mt-6">
              {title}
            </h2>

            <p className="mt-2 line-clamp-2 max-w-xl text-base text-pretty leading-6 text-muted @min-[640px]/publication:leading-7 @min-[550px]/publication:mt-4">
              {summary}
            </p>

            <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-semibold text-surface-foreground @min-[550px]/publication:pt-8">
              Read publication
              <ChevronRight
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

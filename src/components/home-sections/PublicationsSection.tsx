import type { ReactNode } from "react";
import { PublicationCard, type PublicationCardProps } from "@/src/components/publication-card";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { SectionHeading } from "@/src/components/ui/SectionHeading";

export function PublicationsSection({ publications, emptyState, layout = "overlapping" }: {
  publications: readonly (PublicationCardProps & { id?: string })[];
  emptyState?: ReactNode;
  layout?: "overlapping" | "standalone";
}) {
  return <section aria-labelledby="publications-heading" className={`relative text-foreground${layout === "overlapping" ? " -mb-[100dvh]" : ""}`}>
    <SectionContainer>
      <SectionHeading id="publications-heading">Publications</SectionHeading>
      {!publications.length && emptyState ? emptyState : <div className="grid auto-rows-fr grid-cols-1 gap-6 pb-[calc(100dvh+5rem)] lg:grid-cols-2 lg:gap-8 sm:pb-[calc(100dvh+6rem)]">
        {publications.map(({ id, ...publication }) => <PublicationCard {...publication} className="sticky top-5" key={id ?? publication.href} />)}
      </div>}
    </SectionContainer>
  </section>;
}

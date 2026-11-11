import type { PublicationCardProps } from "@/src/components/publication-card";

export const labPublications: readonly (PublicationCardProps & { id: string })[] = [
  {
    id: "publication-1",
    cover: {
      alt: "Layered green geometric forms crossed by a chartreuse beam",
      src: "/publication-cover.svg",
    },
    date: "2026-09-18",
    href: "/publication-details-lab",
    summary:
      "A practical framework for making complex product decisions legible, accountable, and easier for teams to trust.",
    tags: ["Product strategy", "Systems thinking", "Research"],
    title: "Designing for trust in invisible systems",
  },
  {
    id: "publication-2",
    cover: {
      alt: "Layered green geometric forms crossed by a chartreuse beam",
      src: "/publication-cover.svg",
    },
    date: "2026-09-12",
    href: "/publication-details-lab",
    summary:
      "How clear boundaries help teams turn broad ambitions into focused product decisions and coherent design systems.",
    tags: ["Design systems", "Product strategy"],
    title: "Designing with productive constraints",
  },
  {
    id: "publication-3",
    cover: {
      alt: "Layered green geometric forms crossed by a chartreuse beam",
      src: "/publication-cover.svg",
    },
    date: "2026-09-05",
    href: "/publication-details-lab",
    summary:
      "Making ownership, context, and next steps easier to follow when work moves between people and tools.",
    tags: ["Collaboration", "Systems thinking"],
    title: "Making handoffs visible",
  },
  {
    id: "publication-4",
    cover: {
      alt: "Layered green geometric forms crossed by a chartreuse beam",
      src: "/publication-cover.svg",
    },
    date: "2026-08-28",
    href: "/publication-details-lab",
    summary:
      "A practical approach to connecting research evidence with the everyday choices that shape a product experience.",
    tags: ["Research", "Product design"],
    title: "Turning research into everyday decisions",
  },
];

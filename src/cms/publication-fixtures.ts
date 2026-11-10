import { labPublications } from "@/app/lab-publications";
import { samplePublication } from "@/src/components/publication-details/sample-publication";
import { emptyPublication, type PublicationRecord } from "./publications";

export function initialPublications(): PublicationRecord[] {
  return labPublications.map((item, index) => {
    const local = item.href === "/publication-details-lab";
    const draft = {
      ...emptyPublication(),
      title: item.title,
      summary: item.summary,
      kind: local ? ("local" as const) : ("external" as const),
      bodyMarkdown: local ? samplePublication.bodyMarkdown : "",
      externalUrl: local ? "" : item.href,
      coverSrc: item.cover.src,
      coverAlt: item.cover.alt,
      tagsText: item.tags.join(", "),
      publishedOn: item.date,
    };
    return { id: `publication-${index + 1}`, draft, published: { ...draft } };
  });
}

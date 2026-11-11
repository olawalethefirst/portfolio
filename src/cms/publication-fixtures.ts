import { labPublications } from "@/app/lab-publications";
import { samplePublication } from "@/src/components/publication-details/sample-publication";
import { emptyPublication, type PublicationRecord } from "./publications";

export function initialPublications(): PublicationRecord[] {
  return labPublications.map((item, index) => {
    const draft = {
      ...emptyPublication(),
      title: item.title,
      summary: item.summary,
      bodyMarkdown: samplePublication.bodyMarkdown,
      coverSrc: item.cover.src,
      coverAlt: item.cover.alt,
      tagsText: item.tags.join(", "),
      publishedOn: item.date,
    };
    return { id: `publication-${index + 1}`, draft, published: { ...draft } };
  });
}

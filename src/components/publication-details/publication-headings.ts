import type { Nodes, Root } from "mdast";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { unified } from "unified";

export interface PublicationHeading {
  id: string;
  label: string;
  level: 2 | 3;
}

function headingText(node: Nodes): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "image" || node.type === "imageReference") return node.alt || "";
  if (node.type === "break") return " ";
  return "children" in node ? node.children.map(headingText).join("") : "";
}

/** One deterministic transform owns both navigation data and rendered IDs. */
function assignPublicationHeadings(tree: Root): PublicationHeading[] {
  const used = new Set<string>();
  const headings: PublicationHeading[] = [];
  for (const node of tree.children) {
    if (node.type !== "heading" || (node.depth !== 2 && node.depth !== 3)) continue;
    const label = headingText(node).replace(/\s+/g, " ").trim();
    const slug = label.normalize("NFKC").toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "").trim().replace(/[\s-]+/g, "-") || "section";
    const base = `publication-section-${slug}`;
    let id = base;
    let suffix = 1;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id, tabIndex: -1 } };
    headings.push({ id, label: label || "Section", level: node.depth });
  }
  return headings;
}

const parser = unified().use(remarkParse).use(remarkGfm);

export function getPublicationHeadings(markdown: string): PublicationHeading[] {
  return assignPublicationHeadings(parser.parse(markdown));
}

export function remarkPublicationHeadings() {
  return (tree: Root) => { assignPublicationHeadings(tree); };
}

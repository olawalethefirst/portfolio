import type { Nodes } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse);
function plainText(node: Nodes): string {
  if (node.type === "html" || node.type === "definition") return "";
  if ("value" in node) return node.value;
  if (node.type === "image" || node.type === "imageReference") return node.alt ?? "";
  if ("children" in node) {
    const separator = node.type === "paragraph" || node.type === "heading" || node.type === "link" || node.type === "strong" || node.type === "emphasis" ? "" : " ";
    return node.children.map(plainText).join(separator);
  }
  return " ";
}
export function articleSummary(markdown: string) {
  const text = plainText(parser.parse(markdown)).replace(/\s+/g, " ").trim();
  return { excerpt: text.length > 240 ? `${text.slice(0, 240)}…` : text, words: text ? text.split(/\s+/).length : 0 };
}

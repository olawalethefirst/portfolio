import { formatMarkdown, type TextSelection } from "./markdown-formatting";

export type ArticleFormat = "bold" | "italic" | "quote" | "bullet-list" | "numbered-list" | "inline-code" | `heading-${1 | 2 | 3 | 4 | 5 | 6}`;
export type ArticleInsertion =
  | { kind: "link" | "image"; text: string; url: string }
  | { kind: "code"; text: string; language: string };

function replace(value: string, { start, end }: TextSelection, text: string, selectedStart = 0, selectedEnd = text.length) {
  return {
    text: value.slice(0, start) + text + value.slice(end),
    selection: { start: start + selectedStart, end: start + selectedEnd },
    edit: { start, end, text },
  };
}

function fence(text: string, minimum: number) {
  return "`".repeat(Math.max(minimum, ...[...text.matchAll(/`+/g)].map(([run]) => run.length + 1)));
}

function block(value: string, range: TextSelection, text: string) {
  const before = value.slice(0, range.start);
  const after = value.slice(range.end);
  const prefix = before ? "\n".repeat(Math.max(0, 2 - (before.match(/\n*$/)?.[0].length ?? 0))) : "";
  const suffix = after ? "\n".repeat(Math.max(0, 2 - (after.match(/^\n*/)?.[0].length ?? 0))) : "";
  return replace(value, range, prefix + text + suffix, prefix.length, prefix.length + text.length);
}

export function formatArticle(value: string, range: TextSelection, format: ArticleFormat) {
  if (format === "bold" || format === "italic" || format === "quote") return formatMarkdown(value, range, format)!;
  if (format === "inline-code") {
    const content = value.slice(range.start, range.end) || "code";
    const delimiter = fence(content, 1);
    const padding = content.startsWith("`") || content.endsWith("`") ? " " : "";
    return replace(value, range, delimiter + padding + content + padding + delimiter,
      delimiter.length + padding.length, delimiter.length + padding.length + content.length);
  }
  const start = range.start === 0 ? 0 : value.lastIndexOf("\n", range.start - 1) + 1;
  const last = range.end > start && value[range.end - 1] === "\n" ? range.end - 1 : range.end;
  const nextBreak = value.indexOf("\n", last);
  const end = nextBreak < 0 ? value.length : nextBreak;
  const lines = value.slice(start, end) || (format.startsWith("heading-") ? "Heading" : "List item");
  const text = lines.split("\n").map((line, index) => {
    if (format.startsWith("heading-")) return `${"#".repeat(Number(format.slice(-1)))} ${line.replace(/^#{1,6}\s+/, "")}`;
    const content = line.replace(/^\s*(?:[-+*]|\d+[.)])\s+/, "");
    return format === "bullet-list" ? `- ${content}` : `${index + 1}. ${content}`;
  }).join("\n");
  return replace(value, { start, end }, text);
}

export function insertArticleMedia(value: string, range: TextSelection, insertion: ArticleInsertion) {
  if (insertion.kind === "code") {
    const delimiter = fence(insertion.text, 3);
    return block(value, range, `${delimiter}${insertion.language}\n${insertion.text}\n${delimiter}`);
  }
  const label = insertion.text.replace(/([\\\[\]])/g, "\\$1").replace(/\r?\n/g, " ");
  const url = insertion.url.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/[\r\n]/g, "");
  const markdown = `${insertion.kind === "image" ? "!" : ""}[${label}](<${url}>)`;
  if (insertion.kind === "image") {
    const result = block(value, range, markdown);
    const start = result.selection.start + 2;
    return { ...result, selection: { start, end: start + label.length } };
  }
  return replace(value, range, markdown);
}

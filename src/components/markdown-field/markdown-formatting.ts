export type MarkdownFormat = "bold" | "italic" | "link" | "quote";
export interface TextSelection { start: number; end: number }

export function formatMarkdown(value: string, selection: TextSelection, format: MarkdownFormat, maxLength = Infinity) {
  let { start, end } = selection;
  start = Math.max(0, Math.min(start, value.length));
  end = Math.max(start, Math.min(end, value.length));
  const selected = value.slice(start, end);
  let insertion: string;
  let nextSelection: TextSelection;
  if (format === "quote") {
    start = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
    const lastIncluded = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const nextBreak = value.indexOf("\n", lastIncluded);
    end = nextBreak === -1 ? value.length : nextBreak;
    const lines = value.slice(start, end) || "quote";
    insertion = lines.split("\n").map((line) => `> ${line}`).join("\n");
    nextSelection = { start: start + 2, end: start + insertion.length };
  } else if (format === "link") {
    const label = selected || "link text";
    insertion = `[${label}](https://example.com)`;
    nextSelection = { start: start + label.length + 3, end: start + insertion.length - 1 };
  } else {
    const marker = format === "bold" ? "**" : "*";
    const content = selected || `${format} text`;
    insertion = `${marker}${content}${marker}`;
    nextSelection = { start: start + marker.length, end: start + marker.length + content.length };
  }
  const text = value.slice(0, start) + insertion + value.slice(end);
  return text.length > maxLength ? null : {
    text,
    selection: nextSelection,
    edit: { start, end, text: insertion },
  };
}

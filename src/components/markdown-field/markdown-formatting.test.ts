import { describe, expect, it } from "vitest";
import { formatMarkdown } from "./markdown-formatting";

describe("Markdown commands", () => {
  it("preserves surrounding text and the selected word", () => {
    expect(formatMarkdown("hello world", { start: 6, end: 11 }, "bold")).toEqual({ text: "hello **world**", selection: { start: 8, end: 13 } });
    expect(formatMarkdown("word", { start: 0, end: 4 }, "italic")?.text).toBe("*word*");
  });
  it("inserts selected placeholders and selects the link URL", () => {
    const bold = formatMarkdown("", { start: 0, end: 0 }, "bold")!;
    expect(bold.text.slice(bold.selection.start, bold.selection.end)).toBe("bold text");
    const link = formatMarkdown("read", { start: 0, end: 4 }, "link")!;
    expect(link.text).toBe("[read](https://example.com)");
    expect(link.text.slice(link.selection.start, link.selection.end)).toBe("https://example.com");
    expect(formatMarkdown("", { start: 0, end: 0 }, "link")?.text).toContain("[link text]");
  });
  it("quotes whole intersected lines without including the next unselected line", () => {
    expect(formatMarkdown("one\ntwo\nthree", { start: 1, end: 8 }, "quote")?.text).toBe("> one\n> two\nthree");
    expect(formatMarkdown("", { start: 0, end: 0 }, "quote")?.text).toBe("> quote");
  });
  it("rejects over-limit edits without truncating source", () => {
    expect(formatMarkdown("word", { start: 0, end: 4 }, "bold", 7)).toBeNull();
  });
});

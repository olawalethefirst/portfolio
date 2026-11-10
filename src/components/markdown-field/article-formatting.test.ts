import { expect, it } from "vitest";
import { formatArticle, insertArticleMedia } from "./article-formatting";

it("formats whole selected lines as headings, lists and quotes", () => {
  const selection = { start: 1, end: 8 };
  expect(formatArticle("one\ntwo\nthree", selection, "bullet-list").text).toBe("- one\n- two\nthree");
  expect(formatArticle("one\ntwo\nthree", selection, "numbered-list").text).toBe("1. one\n2. two\nthree");
  expect(formatArticle("one\ntwo", { start: 0, end: 3 }, "heading-3").text).toBe("### one\ntwo");
  expect(formatArticle("## one", { start: 3, end: 6 }, "heading-4").text).toBe("#### one");
  expect(formatArticle("one", { start: 0, end: 3 }, "quote").text).toBe("> one");
});

it("preserves surrounding source and chooses safe delimiters for code", () => {
  expect(formatArticle("hello world", { start: 6, end: 11 }, "bold").text).toBe("hello **world**");
  expect(formatArticle("word", { start: 0, end: 4 }, "italic").text).toBe("*word*");
  expect(formatArticle("a`b", { start: 0, end: 3 }, "inline-code").text).toBe("``a`b``");
  expect(insertArticleMedia("before after", { start: 7, end: 7 }, { kind: "code", text: 'const x = "```";', language: "ts" }).text)
    .toBe('before \n\n````ts\nconst x = "```";\n````\n\nafter');
});

it("escapes link labels and image descriptions without losing the insertion range", () => {
  const result = insertArticleMedia("start end", { start: 6, end: 6 }, { kind: "link", text: "[Guide]", url: "https://example.com/a(b)" });
  expect(result.text).toBe("start [\\[Guide\\]](<https://example.com/a(b)>)end");
  const image = insertArticleMedia("", { start: 0, end: 0 }, { kind: "image", text: "A [chart]", url: "/chart.webp" });
  expect(image.text).toBe("![A \\[chart\\]](</chart.webp>)");
});

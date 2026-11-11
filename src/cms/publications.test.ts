import { describe, expect, it } from "vitest";
import {
  applyPublicationAction,
  emptyPublication,
  publicationState,
  validatePublication,
} from "./publications";

describe("publication editing contract", () => {
  it("keeps a published article intact when a revised draft is saved", () => {
    const original = { ...emptyPublication(), title: "Original" };
    const record = { id: "article", draft: original, published: original };
    const revision = { ...original, title: "Revised" };
    const saved = applyPublicationAction(record, revision, "save");
    expect(saved.published?.title).toBe("Original");
    expect(saved.draft.title).toBe("Revised");
    expect(publicationState(saved)).toBe("Published · Unpublished changes");
    expect(
      applyPublicationAction(saved, revision, "publish").published?.title,
    ).toBe("Revised");
  });
  it("unpublishes without throwing away the draft", () => {
    const value = { ...emptyPublication(), title: "Keep this" };
    const result = applyPublicationAction(
      { id: "a", draft: value, published: value },
      value,
      "unpublish",
    );
    expect(result.published).toBeNull();
    expect(result.draft.title).toBe("Keep this");
  });
  it("requires article content for publishing even when a legacy external destination exists", () => {
    const legacy = {
      ...completePublication(), bodyMarkdown: "", kind: "external",
      externalUrl: "https://example.com/article",
    };
    expect(validatePublication(legacy, "2026-11-09").bodyMarkdown)
      .toBe("Write your article before publishing.");
    expect(validatePublication({ ...legacy, bodyMarkdown: "   " }, "2026-11-09").bodyMarkdown)
      .toBeTruthy();
    expect(validatePublication(completePublication(), "2026-11-09")).toEqual({});
  });
  it("rejects invalid and future dates rather than silently scheduling", () => {
    expect(
      validatePublication(
        { ...emptyPublication(), publishedOn: "2026-02-30" },
        "2026-11-03",
      ).publishedOn,
    ).toBeTruthy();
    expect(
      validatePublication(
        { ...emptyPublication(), publishedOn: "2027-01-01" },
        "2026-11-03",
      ).publishedOn,
    ).toContain("Scheduling");
  });
});

const completePublication = () => ({ ...emptyPublication(), title: "Article", summary: "Summary", bodyMarkdown: "Article body", coverSrc: "/cover.png", coverAlt: "Cover", publishedOn: "2026-11-09" });

it.each([["title", 40], ["summary", 112]] as const)("enforces %s publish budget while keeping over-limit drafts", async (field, max) => {
  const { publicationDraftSchema, createPublicationPublishSchema } = await import("./publications");
  const schema = createPublicationPublishSchema("2026-11-09");
  const draft = { ...completePublication(), [field]: "a".repeat(max) };
  expect(schema.safeParse(draft).success).toBe(true);
  draft[field] += "a";
  expect(validatePublication(draft, "2026-11-09")[field]).toBe(`Use ${max} characters or fewer.`);
  expect(publicationDraftSchema.parse(draft)).toEqual(draft);
});

it("enforces parsed tag budgets without changing raw tags or existing deduplication", async () => {
  const { createPublicationPublishSchema, publicationDraftSchema } = await import("./publications");
  const schema = createPublicationPublishSchema("2026-11-09");
  const draft = { ...completePublication(), tagsText: ` ${"a".repeat(16)}, second, THIRD, third, ` };
  expect(schema.parse(draft).tagsText).toBe(draft.tagsText);
  expect(schema.safeParse({ ...draft, tagsText: "a".repeat(17) }).success).toBe(false);
  expect(schema.safeParse({ ...draft, tagsText: "one,two,three,four" }).success).toBe(false);
  expect(schema.safeParse({ ...draft, tagsText: "" }).success).toBe(true);
  expect(publicationDraftSchema.safeParse({ ...draft, tagsText: "a".repeat(500) }).success).toBe(true);
});

it("permits long article bodies and requires cover descriptions", async () => {
  const { createPublicationPublishSchema } = await import("./publications");
  const schema = createPublicationPublishSchema("2026-11-09");
  const article = { ...completePublication(), bodyMarkdown: "Long body ".repeat(20000), coverSrc: " " };
  expect(schema.safeParse({ ...article, coverAlt: "   ", decorativeCover: true }).success).toBe(false);
  expect(schema.parse(article)).toEqual(article);
  expect(schema.safeParse({ ...article, publishedOn: "2026-11-10" }).success).toBe(false);
  expect(schema.safeParse({ ...article, publishedOn: "2026-02-30" }).success).toBe(false);
});

it("restores legacy browser drafts without retaining publication type or losing article content", async () => {
  const { publicationDraftSchema } = await import("./publications");
  const article = completePublication();
  expect(publicationDraftSchema.parse({ ...article, kind: "external", externalUrl: "https://example.com/old" }))
    .toEqual(article);
  expect(publicationDraftSchema.parse({ ...emptyPublication(), kind: "external", externalUrl: "https://example.com/old" }))
    .toEqual(emptyPublication());
});

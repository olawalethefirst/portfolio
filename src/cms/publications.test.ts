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
  it("requires complete publication content but validates only the active destination", () => {
    expect(
      validatePublication(emptyPublication(), "2026-11-03").title,
    ).toBeTruthy();
    const external = {
      ...emptyPublication(),
      title: "Article",
      summary: "Summary",
      kind: "external" as const,
      externalUrl: "https://example.com/article",
      coverSrc: "/publication-cover.svg",
      coverAlt: "Cover",
      publishedOn: "2026-09-18",
    };
    expect(validatePublication(external, "2026-11-03")).toEqual({});
    expect(
      validatePublication({ ...external, kind: "local" }, "2026-11-03")
        .bodyMarkdown,
    ).toBeTruthy();
    expect(
      validatePublication(
        { ...external, externalUrl: "javascript:alert(1)" },
        "2026-11-03",
      ).externalUrl,
    ).toBeTruthy();
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

import { describe, expect, it } from "vitest";
import { getPublicationHeadings } from "./publication-headings";

describe("publication headings", () => {
  it("extracts formatted headings and Setext h2 labels in source order", () => {
    expect(getPublicationHeadings("## A **clear** `decision`\n\n### [Details](https://example.com)\n\nAnother section\n---")).toEqual([
      { id: "publication-section-a-clear-decision", label: "A clear decision", level: 2 },
      { id: "publication-section-details", label: "Details", level: 3 },
      { id: "publication-section-another-section", label: "Another section", level: 2 },
    ]);
  });
  it("avoids collisions and retains non-English labels", () => {
    const markdown = "## Overview\n\n## Overview\n\n## Overview-1\n\n## 日本語\n\n## !!!\n\n## ???";
    const first = getPublicationHeadings(markdown);
    expect(new Set(first.map((heading) => heading.id)).size).toBe(first.length);
    expect(first[3].id).toBe("publication-section-日本語");
    expect(first[4].id).toBe("publication-section-section");
    expect(first).toEqual(getPublicationHeadings(markdown));
  });
  it("ignores code, quoted headings, list examples and non-section levels", () => {
    expect(getPublicationHeadings('# Title\n\n> ## Quoted\n\n- ### Nested\n\n```md\n## Example\n```\n\n#### Detail')).toEqual([]);
  });
});

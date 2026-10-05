import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicationDetails } from "./PublicationDetails";

const publication = {
  bodyMarkdown: `
Making hidden decisions visible gives teams something concrete to examine.

## Trust begins with legibility

Useful systems explain **what changed** and [where to learn more](https://example.com/trust).

### Signals worth preserving

- The decision
- The evidence

> Transparency helps only when the information is understandable.

Use \`decisionState\` to keep the current state explicit.

\`\`\`ts
const decisionState = "reviewable";
\`\`\`

![A decision moving from evidence to review](/prism-assets/wireframe.svg)

| Signal | Meaning |
| --- | --- |
| Visible | Reviewable |
`,
  cover: {
    alt: "Layered green geometric forms crossed by a chartreuse beam",
    src: "/publication-cover.svg",
  },
  publishedAt: "2026-09-18",
  readingTimeMinutes: 8,
  tags: ["Product strategy", "Systems thinking", "Research"],
  title: "Designing for trust in invisible systems",
} as const;

describe("PublicationDetails", () => {
  it("presents the approved cover-first publication metadata", () => {
    render(<PublicationDetails publication={publication} />);

    const article = screen.getByRole("article", {
      name: publication.title,
    });
    const cover = within(article).getByAltText(publication.cover.alt);
    const title = within(article).getByRole("heading", {
      level: 1,
      name: publication.title,
    });
    const topics = within(article).getByRole("list", { name: "Topics" });
    const publicationDate = within(article).getByText("Sep 18, 2026");
    const articleBodyHeading = within(article).getByRole("heading", {
      level: 2,
      name: "Trust begins with legibility",
    });

    expect(within(topics).getByText("Product strategy")).toBeTruthy();
    expect(within(topics).getByText("Systems thinking")).toBeTruthy();
    expect(within(topics).getByText("Research")).toBeTruthy();
    expect(publicationDate.closest("time")?.dateTime).toBe(
      publication.publishedAt,
    );
    expect(within(article).getByText("8 min read")).toBeTruthy();

    expect(
      cover.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      title.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      topics.compareDocumentPosition(publicationDate) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      publicationDate.compareDocumentPosition(articleBodyHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the portable Markdown body as semantic article content", () => {
    const { container } = render(
      <PublicationDetails publication={publication} />,
    );

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Signals worth preserving",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "where to learn more" }).getAttribute(
        "href",
      ),
    ).toBe("https://example.com/trust");
    expect(screen.getByText("The decision").closest("ul")).toBeTruthy();
    expect(
      screen.getByAltText("A decision moving from evidence to review"),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(
      screen.getByText('const decisionState = "reviewable";').closest("pre"),
    ).toBeTruthy();
    expect(container.querySelector("blockquote")?.textContent).toContain(
      "Transparency helps",
    );
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationDetails } from "./PublicationDetails";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

it("links every contents entry to one corresponding article heading", () => {
  const bodyMarkdown = '### Early detail\n\n## A **clear** `decision`\n\n### Details\n\n## A clear decision\n\n## A clear decision-1\n\n## 日本語\n\nAnother section\n---\n\n> ## Quoted example\n\n```md\n## Code example\n```';
  const { container } = render(<PublicationDetails publication={{ ...publication, bodyMarkdown }} />);
  const navigation = screen.getByRole("navigation", { name: "Article sections" });
  const links = within(navigation).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual(["Early detail", "A clear decision", "Details", "A clear decision", "A clear decision-1", "日本語", "Another section"]);
  const ids = links.map((link) => link.getAttribute("href")!.slice(1));
  expect(new Set(ids).size).toBe(ids.length);
  for (const link of links) {
    const id = link.getAttribute("href")!.slice(1);
    const destinations = [...container.querySelectorAll("h2[id], h3[id]")].filter((heading) => heading.id === id);
    expect(destinations).toHaveLength(1);
    expect(destinations[0].textContent).toBe(link.textContent);
    expect(destinations[0].getAttribute("tabindex")).toBe("-1");
  }
});

it("omits the navigation when there are no article sections", () => {
  render(<PublicationDetails publication={{ ...publication, bodyMarkdown: "A short article without sections." }} />);
  expect(screen.queryByRole("navigation", { name: "Article sections" })).toBeNull();
  expect(screen.getByText("A short article without sections.")).toBeTruthy();
});

it("opens the contents drawer and closes it after choosing a heading", async () => {
  render(<PublicationDetails publication={publication} />);
  fireEvent.click(screen.getByRole("button", { name: "Contents" }));
  const drawer = await screen.findByRole("dialog", { name: "Article sections" });
  const link = within(drawer).getByRole("link", { name: "Trust begins with legibility" });
  expect(link.getAttribute("href")).toBe("#publication-section-trust-begins-with-legibility");
  fireEvent.click(link);
  expect(screen.queryByRole("dialog", { name: "Article sections" })).toBeNull();
});

it("shares the active section highlight between the sidebar and drawer", async () => {
  let secondActive = false;
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.id === "publication-section-trust-begins-with-legibility") return { ...originalRect.call(this), top: secondActive ? -400 : 32 } as DOMRect;
    if (this.id === "publication-section-signals-worth-preserving") return { ...originalRect.call(this), top: secondActive ? 30 : 400 } as DOMRect;
    return originalRect.call(this);
  });
  render(<PublicationDetails publication={publication} />);
  await waitFor(() => expect(screen.getByRole("link", { name: "Trust begins with legibility" }).getAttribute("aria-current")).toBe("location"));
  fireEvent.click(screen.getByRole("button", { name: "Contents" }));
  const drawer = await screen.findByRole("dialog", { name: "Article sections" });
  expect(within(drawer).getByRole("link", { name: "Trust begins with legibility" }).getAttribute("aria-current")).toBe("location");
  fireEvent.click(within(drawer).getByRole("button", { name: "Close contents" }));
  secondActive = true;
  fireEvent.scroll(window);
  await waitFor(() => expect(screen.getByRole("link", { name: "Signals worth preserving" }).getAttribute("aria-current")).toBe("location"));
  expect(screen.getByRole("link", { name: "Trust begins with legibility" }).hasAttribute("aria-current")).toBe(false);
});

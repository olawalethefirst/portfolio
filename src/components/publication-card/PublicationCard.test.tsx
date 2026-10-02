import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicationCard } from "./PublicationCard";

const publication = {
  cover: {
    alt: "Angular forms arranged across a deep green editorial cover",
    src: "/dummy_project.webp",
  },
  date: "2026-09-18",
  href: "/publications/designing-with-productive-constraints",
  summary:
    "How clear constraints turn broad product ambitions into decisive design systems.",
  tags: ["Design systems", "Product strategy"],
  title: "Designing with productive constraints",
} as const;

describe("PublicationCard", () => {
  it("presents the complete publication preview", () => {
    render(<PublicationCard {...publication} />);

    const article = screen.getByRole("article", {
      name: publication.title,
    });
    const link = within(article).getByRole("link", {
      name: `Read ${publication.title}`,
    });

    expect(link.getAttribute("href")).toBe(publication.href);
    expect(
      within(article).getByRole("heading", {
        level: 2,
        name: publication.title,
      }),
    ).toBeTruthy();
    expect(within(article).getByAltText(publication.cover.alt)).toBeTruthy();
    expect(within(article).getByText(publication.summary)).toBeTruthy();
    expect(within(article).getByText("Design systems")).toBeTruthy();
    expect(within(article).getByText("Product strategy")).toBeTruthy();
    expect(within(article).getByText("Sep 18, 2026")).toBeTruthy();
    expect(within(article).getByText("Read publication")).toBeTruthy();
    expect(within(article).getAllByRole("link")).toHaveLength(1);
    expect(within(article).queryByRole("button")).toBeNull();
  });
});

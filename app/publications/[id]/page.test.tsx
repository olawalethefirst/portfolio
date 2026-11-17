import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { PublicationDraft } from "@/src/cms/publications";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/src/db/publications", () => ({ readPublication: vi.fn() }));
vi.mock("../../LabThemeShell", () => ({
  LabThemeShell: ({ children }: { children: ReactNode }) => children,
}));

import { readPublication } from "@/src/db/publications";
import PublicationPage, { generateMetadata } from "./page";

const published: PublicationDraft = {
  title: "Designing for trust",
  summary: "A practical framework for legible decisions.",
  bodyMarkdown: "## Heading\n\nSome article content.",
  coverSrc: "/media/asset-1",
  coverAlt: "Layered geometric forms",
  tagsText: "Product strategy, Research",
  publishedOn: "2026-09-18",
};
const params = Promise.resolve({ id: "publication-1" });

beforeEach(() => {
  vi.mocked(readPublication).mockReset();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

it("renders the published article with tags and reading time", async () => {
  vi.mocked(readPublication).mockResolvedValue({
    id: "publication-1",
    draft: { ...published, title: "Unsaved edit" },
    published,
  });
  render(await PublicationPage({ params }));
  expect(
    screen.getByRole("heading", { name: "Designing for trust" }),
  ).toBeTruthy();
  expect(screen.getByRole("list", { name: "Topics" }).textContent).toContain(
    "Product strategy",
  );
  expect(screen.getByText("1 min read")).toBeTruthy();
  expect(screen.getByAltText("Layered geometric forms")).toBeTruthy();
});

it("denies access when the publication has no published snapshot", async () => {
  vi.mocked(readPublication).mockResolvedValue({
    id: "publication-1",
    draft: published,
    published: null,
  });
  await expect(PublicationPage({ params })).rejects.toThrow("NOT_FOUND");
});

it("denies access when the publication does not exist", async () => {
  vi.mocked(readPublication).mockResolvedValue(null);
  await expect(PublicationPage({ params })).rejects.toThrow("NOT_FOUND");
});

it("derives metadata from the published content without exposing unsaved edits", async () => {
  vi.mocked(readPublication).mockResolvedValue({
    id: "publication-1",
    draft: { ...published, title: "Unsaved edit" },
    published,
  });
  await expect(generateMetadata({ params })).resolves.toEqual({
    title: "Designing for trust",
    description: "A practical framework for legible decisions.",
  });
});

it("falls back to a not-found title in metadata when nothing is published", async () => {
  vi.mocked(readPublication).mockResolvedValue(null);
  await expect(generateMetadata({ params })).resolves.toEqual({
    title: "Publication not found",
  });
});

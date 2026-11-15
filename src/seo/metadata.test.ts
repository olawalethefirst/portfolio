import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/src/db/seo", () => ({ readSeoByPath: vi.fn() }));

import { readSeoByPath } from "@/src/db/seo";
import { readSeoMetadata } from "./metadata";
import type { SeoRecord } from "./content";

const defaults: SeoRecord = {
  id: "default", path: "/", title: " Saved title ", description: " Saved description ",
};
let records: SeoRecord[];

beforeEach(() => {
  records = [{ ...defaults }];
  vi.mocked(readSeoByPath).mockReset().mockImplementation(async (path) =>
    records.find((record) => record.path === path) ?? null,
  );
});

it("uses saved defaults for the homepage and paths without an override", async () => {
  for (const path of ["/", "/contact", "/publication-details-lab"]) {
    expect(await readSeoMetadata(path)).toEqual({
      title: "Saved title", description: "Saved description",
    });
  }
});

it.each([
  [" Custom title ", " Custom description ", "Custom title", "Custom description"],
  [" Custom title ", " \n ", "Custom title", "Saved description"],
  [" \t ", " Custom description ", "Saved title", "Custom description"],
])("inherits blank fields independently", async (title, description, expectedTitle, expectedDescription) => {
  records.push({ id: "contact", path: "/contact", title, description });
  expect(await readSeoMetadata("/contact/")).toEqual({
    title: expectedTitle, description: expectedDescription,
  });
});

it("matches only the exact normalized path", async () => {
  records.push({ id: "contact", path: "/contact", title: "Contact override", description: "" });
  expect(await readSeoMetadata("/contact/child")).toEqual({
    title: "Saved title", description: "Saved description",
  });
});

it("reflects saves, path moves and deletions on subsequent reads", async () => {
  const override = { id: "contact", path: "/contact", title: "First title", description: "" };
  records.push(override);
  expect((await readSeoMetadata("/contact")).title).toBe("First title");
  override.title = "Updated title";
  expect((await readSeoMetadata("/contact")).title).toBe("Updated title");
  override.path = "/publication-details-lab";
  expect((await readSeoMetadata("/contact")).title).toBe("Saved title");
  expect((await readSeoMetadata("/publication-details-lab")).title).toBe("Updated title");
  records.pop();
  records[0].title = "Updated default";
  expect((await readSeoMetadata("/publication-details-lab")).title).toBe("Updated default");
});

it("reports missing initialized defaults", async () => {
  records = [];
  await expect(readSeoMetadata("/contact")).rejects.toThrow("SEO defaults were not found.");
});

it("propagates database errors instead of returning demo metadata", async () => {
  vi.mocked(readSeoByPath).mockRejectedValue(new Error("Read failed"));
  await expect(readSeoMetadata("/contact")).rejects.toThrow("Read failed");
});

import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  getDb: () => drizzle(execute),
}));

import type { PublicationDraft } from "@/src/cms/publications";
import { listPublications, readPublication } from "./publications";

const id = "11111111-1111-4111-8111-111111111111";
const asset = "22222222-2222-4222-8222-222222222222";
const content = (
  title: string,
  cover: string,
  publishedOn = "2026-01-01",
): PublicationDraft => ({
  title,
  summary: "Summary",
  bodyMarkdown: "Body",
  coverSrc: cover,
  coverAlt: "Cover",
  tagsText: "alpha, beta",
  publishedOn,
});
const snapshot = (
  title: string,
  image: string | null,
  publishedOn: string | null,
) => [title, "Summary", "Body", image, "Cover", "alpha, beta", publishedOn];
const saved = [id, 2, ...snapshot("Saved edits", asset, "2026-01-02")];
const live = [id, ...snapshot("Live version", asset, "2026-01-01")];

beforeEach(() => {
  execute.mockReset();
});

it("lists saved and published snapshots independently in stable editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  expect(await listPublications()).toEqual([
    {
      id,
      draft: content("Saved edits", `/media/${asset}`, "2026-01-02"),
      published: content("Live version", `/media/${asset}`, "2026-01-01"),
    },
  ]);
  expect(execute.mock.calls[0][0]).toContain(
    'order by "publications"."position" asc, "publications"."id" asc',
  );
});

it("preserves draft-only records and empty cover/date references", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("", null, null), ...Array(8).fill(null)]],
  });
  expect(await readPublication(id)).toEqual({
    id,
    draft: content("", "", ""),
    published: null,
  });
});

it("reads only the requested record with a bound ID", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  const value = await readPublication(id);
  expect(value?.draft.title).toBe("Saved edits");
  expect(value?.published?.title).toBe("Live version");
  expect(execute.mock.calls[0][1]).toEqual([id]);
  expect(execute.mock.calls[0][0]).toContain('where "publications"."id" = $1');
});

it("returns an empty collection without sample records", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await listPublications()).toEqual([]);
});

it("returns null for a missing publication", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await readPublication(id)).toBeNull();
});

it.each(["list", "read"])(
  "propagates %s database failures",
  async (operation) => {
    const failure = new Error("Database unavailable");
    execute.mockRejectedValue(failure);
    await expect(
      operation === "list" ? listPublications() : readPublication(id),
    ).rejects.toMatchObject({ cause: failure });
  },
);

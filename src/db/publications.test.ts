import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  getDb: () => drizzle(execute),
}));

import type { PublicationDraft } from "@/src/cms/publications";
import {
  insertPublication,
  listPublications,
  readPublication,
  updatePublication,
} from "./publications";

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
const draftInput: PublicationDraft = { ...content("Draft", `/media/${asset}`) };
const inserted = [id, 0, ...snapshot("Draft", asset, "2026-01-01")];

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

it("inserts an unfinished draft using database-generated identity and maps its cover reference", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await insertPublication(draftInput)).toEqual({
    id,
    draft: content("Draft", `/media/${asset}`),
    published: null,
  });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^insert into "publications"/);
  expect(query).toContain("returning");
  expect(params).toEqual([
    "Draft",
    "Summary",
    "Body",
    asset,
    "Cover",
    "alpha, beta",
    "2026-01-01",
  ]);
});

it("stores an empty cover as a null asset reference", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("Draft", null, "2026-01-01")]],
  });
  await insertPublication({ ...draftInput, coverSrc: "" });
  expect(execute.mock.calls[0][1][3]).toBeNull();
});

it("stores an empty publication date as a null published_on", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("Draft", asset, null)]],
  });
  await insertPublication({ ...draftInput, publishedOn: "" });
  expect(execute.mock.calls[0][1][6]).toBeNull();
});

it("updates only the requested saved draft and returns the stored record", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await updatePublication(id, draftInput)).toEqual({
    id,
    draft: content("Draft", `/media/${asset}`),
    published: null,
  });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^update "publications"/);
  expect(query).toContain('where "publications"."id" = $8');
  expect(query).toContain("returning");
  expect(params).toEqual([
    "Draft",
    "Summary",
    "Body",
    asset,
    "Cover",
    "alpha, beta",
    "2026-01-01",
    id,
  ]);
});

it("returns null when an update finds no publication", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await updatePublication(id, draftInput)).toBeNull();
});

it("reports an insert without a returned row", async () => {
  execute.mockResolvedValue({ rows: [] });
  await expect(insertPublication(draftInput)).rejects.toThrow(
    "Publication insert did not return content.",
  );
});

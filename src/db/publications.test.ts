import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  getDb: () => {
    const db = drizzle(execute);
    // The proxy compiles real SQL but cannot open transactions. Real PostgreSQL
    // locking/rollback verification remains a separate controller check.
    return Object.assign(db, {
      transaction: async <T>(operation: (tx: typeof db) => Promise<T>) =>
        operation(db),
    });
  },
}));

import type { PublicationDraft } from "@/src/cms/publications";
import {
  createAndPublishPublication,
  deletePublication,
  deletePublishedPublication,
  insertPublication,
  listPublications,
  listPublishedPublications,
  readPublication,
  reorderPublications,
  saveAndPublishPublication,
  updatePublication,
} from "./publications";

const id = "11111111-1111-4111-8111-111111111111";
const asset = "22222222-2222-4222-8222-222222222222";
const cover = "https://cdn.example.com/cover.jpg";
const content = (
  title: string,
  coverSrc: string,
  publishedOn = "2026-01-01",
): PublicationDraft => ({
  title,
  summary: "Summary",
  bodyMarkdown: "Body",
  coverSrc,
  coverAlt: "Cover",
  tagsText: "alpha, beta",
  publishedOn,
});
const snapshot = (
  title: string,
  coverSrc: string,
  publishedOn: string | null,
) => [title, "Summary", "Body", coverSrc, "Cover", "alpha, beta", publishedOn];
const saved = [id, 2, ...snapshot("Saved edits", cover, "2026-01-02")];
const live = [id, ...snapshot("Live version", cover, "2026-01-01")];
const draftInput: PublicationDraft = { ...content("Draft", cover) };
const inserted = [id, 0, ...snapshot("Draft", cover, "2026-01-01")];

beforeEach(() => {
  execute.mockReset();
});

it("lists saved and published snapshots independently in stable editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  expect(await listPublications()).toEqual([
    {
      id,
      draft: content("Saved edits", cover, "2026-01-02"),
      published: content("Live version", cover, "2026-01-01"),
    },
  ]);
  expect(execute.mock.calls[0][0]).toContain(
    'order by "publications"."position" asc, "publications"."id" asc',
  );
});

it("lists only published publications, with id, in editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...live]] });
  expect(await listPublishedPublications()).toEqual([
    { id, ...content("Live version", cover, "2026-01-01") },
  ]);
  expect(execute.mock.calls[0][0]).toBe(
    'select "published_publications"."publication_id", "published_publications"."title", "published_publications"."summary", "published_publications"."body_markdown", "published_publications"."cover_src", "published_publications"."cover_alt", "published_publications"."tags_text", "published_publications"."published_on" from "published_publications" inner join "publications" on "publications"."id" = "published_publications"."publication_id" order by "publications"."position" asc, "publications"."id" asc',
  );
});

it("excludes a publication with no published snapshot", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await listPublishedPublications()).toEqual([]);
});

it("preserves draft-only records and empty cover/date references", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("", "", null), ...Array(8).fill(null)]],
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

it("inserts an unfinished draft using database-generated identity and stores its cover URL", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await insertPublication(draftInput)).toEqual({
    id,
    draft: content("Draft", cover),
    published: null,
  });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^insert into "publications"/);
  expect(query).toContain("returning");
  expect(params).toEqual([
    "Draft",
    "Summary",
    "Body",
    cover,
    "Cover",
    "alpha, beta",
    "2026-01-01",
  ]);
});

it("stores an empty cover as an empty string, not null", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("Draft", "", "2026-01-01")]],
  });
  await insertPublication({ ...draftInput, coverSrc: "" });
  expect(execute.mock.calls[0][1][3]).toBe("");
});

it("stores an empty publication date as a null published_on", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("Draft", cover, null)]],
  });
  await insertPublication({ ...draftInput, publishedOn: "" });
  expect(execute.mock.calls[0][1][6]).toBeNull();
});

it("updates only the requested saved draft and returns the stored record", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await updatePublication(id, draftInput)).toEqual({
    id,
    draft: content("Draft", cover),
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
    cover,
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

it("saves and publishes an existing publication atomically", async () => {
  execute
    .mockResolvedValueOnce({ rows: [saved] })
    .mockResolvedValueOnce({ rows: [live] });
  expect(
    await saveAndPublishPublication(
      id,
      content("Live version", cover, "2026-01-01"),
    ),
  ).toEqual({
    id,
    draft: content("Saved edits", cover, "2026-01-02"),
    published: content("Live version", cover, "2026-01-01"),
  });
  const [updateQuery] = execute.mock.calls[0];
  expect(updateQuery).toMatch(/^update "publications"/);
  const [insertQuery] = execute.mock.calls[1];
  expect(insertQuery).toMatch(/^insert into "published_publications"/);
  expect(insertQuery).toContain('on conflict ("publication_id") do update');
});

it("returns null when saving a missing publication, without publishing", async () => {
  execute.mockResolvedValueOnce({ rows: [] });
  expect(await saveAndPublishPublication(id, draftInput)).toBeNull();
  expect(execute).toHaveBeenCalledTimes(1);
});

it("throws when publish persistence returns no row after a successful save", async () => {
  execute
    .mockResolvedValueOnce({ rows: [inserted] })
    .mockResolvedValueOnce({ rows: [] });
  await expect(saveAndPublishPublication(id, draftInput)).rejects.toThrow(
    "Publication publish did not return content.",
  );
});

it("creates and publishes a new publication atomically", async () => {
  execute.mockResolvedValueOnce({ rows: [inserted] }).mockResolvedValueOnce({
    rows: [[id, ...snapshot("Draft", cover, "2026-01-01")]],
  });
  expect(await createAndPublishPublication(draftInput)).toEqual({
    id,
    draft: content("Draft", cover),
    published: content("Draft", cover),
  });
  const [insertPubQuery] = execute.mock.calls[0];
  expect(insertPubQuery).toMatch(/^insert into "publications"/);
  const [insertLiveQuery] = execute.mock.calls[1];
  expect(insertLiveQuery).toMatch(/^insert into "published_publications"/);
  expect(insertLiveQuery).not.toContain("on conflict");
});

it("throws when a first-publish create does not return a saved row", async () => {
  execute.mockResolvedValueOnce({ rows: [] });
  await expect(createAndPublishPublication(draftInput)).rejects.toThrow(
    "Publication creation did not return content.",
  );
});

it("throws when first-publish persistence returns no live row", async () => {
  execute
    .mockResolvedValueOnce({ rows: [inserted] })
    .mockResolvedValueOnce({ rows: [] });
  await expect(createAndPublishPublication(draftInput)).rejects.toThrow(
    "Publication publish did not return content.",
  );
});

it("deletes only the published snapshot and returns its stored content", async () => {
  execute.mockResolvedValue({ rows: [live] });
  expect(await deletePublishedPublication(id)).toEqual(
    content("Live version", cover, "2026-01-01"),
  );
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^delete from "published_publications"/);
  expect(query).toContain(
    'where "published_publications"."publication_id" = $1',
  );
  expect(query).toContain("returning");
  expect(params).toEqual([id]);
});

it("returns null when no published publication exists", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await deletePublishedPublication(id)).toBeNull();
});

it("deletes only the requested publication, leaving media untouched and snapshot removal to the database cascade", async () => {
  execute.mockResolvedValue({ rows: [[id]] });
  expect(await deletePublication(id)).toBe(id);
  expect(execute).toHaveBeenCalledTimes(1);
  const [query, params] = execute.mock.calls[0];
  expect(query).toBe(
    'delete from "publications" where "publications"."id" = $1 returning "id"',
  );
  expect(params).toEqual([id]);
});

it("returns null when deleting a missing publication", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await deletePublication(id)).toBeNull();
});

it("propagates publication deletion failures rather than reporting success", async () => {
  const failure = new Error("Database unavailable");
  execute.mockRejectedValue(failure);
  await expect(deletePublication(id)).rejects.toMatchObject({ cause: failure });
});

it("persists the complete requested order using bound IDs and only updates positions", async () => {
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[id], [asset]] })
    .mockResolvedValueOnce({ rows: [] });
  expect(await reorderPublications([asset, id])).toEqual({ status: "saved" });
  const [lock, membership, update] = execute.mock.calls;
  expect(lock[0]).toBe('lock table "publications" in share row exclusive mode');
  expect(membership[0]).toBe('select "id" from "publications"');
  expect(update[0]).toBe(
    'update "publications" set "position" = case "publications"."id" when $1::uuid then $2::integer when $3::uuid then $4::integer end',
  );
  expect(update[1]).toEqual([asset, 0, id, 1]);
});

it.each([
  ["duplicate", [id, id]],
  ["missing", [id]],
  ["unknown", [id, "33333333-3333-4333-8333-333333333333"]],
  ["empty stale list", []],
])("rejects %s membership without writing positions", async (_label, ids) => {
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[id], [asset]] });
  expect(await reorderPublications(ids)).toEqual({ status: "conflict" });
  expect(
    execute.mock.calls.some(([query]) => query.startsWith("update ")),
  ).toBe(false);
});

it("accepts an empty ordering only when the collection is empty", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await reorderPublications([])).toEqual({ status: "saved" });
  expect(
    execute.mock.calls.some(([query]) => query.startsWith("update ")),
  ).toBe(false);
});

it("rejects an unknown ID in an empty collection", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await reorderPublications([id])).toEqual({ status: "conflict" });
});

it("compares UUID identity without case sensitivity", async () => {
  const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[uuid]] })
    .mockResolvedValueOnce({ rows: [] });
  expect(await reorderPublications([uuid.toUpperCase()])).toEqual({
    status: "saved",
  });
  expect(execute.mock.calls[2][1]).toEqual([uuid, 0]);
});

it("rejects duplicate UUID identities even with different casing", async () => {
  const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  expect(await reorderPublications([uuid, uuid.toUpperCase()])).toEqual({
    status: "conflict",
  });
  expect(execute).not.toHaveBeenCalled();
});

it("repeating an order assigns the same positions", async () => {
  execute.mockImplementation(async (query: string) => ({
    rows: query.startsWith("select ") ? [[id], [asset]] : [],
  }));
  expect(await reorderPublications([asset, id])).toEqual({ status: "saved" });
  expect(await reorderPublications([asset, id])).toEqual({ status: "saved" });
  const updates = execute.mock.calls.filter(([query]) =>
    query.startsWith("update "),
  );
  expect(updates.map(([, params]) => params)).toEqual([
    [asset, 0, id, 1],
    [asset, 0, id, 1],
  ]);
});

it.each(["lock", "membership"])(
  "does not write when %s fails",
  async (stage) => {
    const failure = new Error("Database unavailable");
    if (stage === "membership") execute.mockResolvedValueOnce({ rows: [] });
    execute.mockRejectedValueOnce(failure);
    await expect(reorderPublications([id])).rejects.toMatchObject({
      cause: failure,
    });
    expect(
      execute.mock.calls.some(([query]) => query.startsWith("update ")),
    ).toBe(false);
  },
);

it("propagates a failed ordering write instead of reporting success", async () => {
  const failure = new Error("Write failed");
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[id], [asset]] })
    .mockRejectedValueOnce(failure);
  await expect(reorderPublications([asset, id])).rejects.toMatchObject({
    cause: failure,
  });
});

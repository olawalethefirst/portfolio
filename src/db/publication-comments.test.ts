import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import {
  insertPublicationComment,
  listPublicationComments,
  readPublicationComment,
} from "./publication-comments";

const id = "11111111-1111-4111-8111-111111111111";
const publicationId = "22222222-2222-4222-8222-222222222222";
const createdAt = "2026-01-01 10:00:00+00";
const row = [id, publicationId, null, "Ada", "Hello", createdAt];
const comment = {
  id,
  publicationId,
  parentId: null,
  name: "Ada",
  bodyMarkdown: "Hello",
  createdAt,
};

beforeEach(() => {
  execute.mockReset();
});

it("lists one publication's comments with a bound ID, oldest first", async () => {
  execute.mockResolvedValue({ rows: [row] });
  expect(await listPublicationComments(publicationId)).toEqual([comment]);
  expect(execute.mock.calls[0][1]).toEqual([publicationId]);
  expect(execute.mock.calls[0][0]).toBe(
    'select "id", "publication_id", "parent_id", "name", "body_markdown", "created_at" from "publication_comments" where "publication_comments"."publication_id" = $1 order by "publication_comments"."created_at" asc, "publication_comments"."id" asc',
  );
});

it("returns an empty list when a publication has no comments", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await listPublicationComments(publicationId)).toEqual([]);
});

it("reads one comment by bound ID, or null when absent", async () => {
  execute.mockResolvedValueOnce({ rows: [row] });
  expect(await readPublicationComment(id)).toEqual(comment);
  expect(execute.mock.calls[0][1]).toEqual([id]);
  execute.mockResolvedValueOnce({ rows: [] });
  expect(await readPublicationComment(id)).toBeNull();
});

it("inserts a comment and returns the stored row", async () => {
  execute.mockResolvedValue({ rows: [row] });
  const input = { publicationId, parentId: null, name: "Ada", bodyMarkdown: "Hello" };
  expect(await insertPublicationComment(input)).toEqual(comment);
  expect(execute.mock.calls[0][0]).toContain('insert into "publication_comments"');
  expect(execute.mock.calls[0][1]).toEqual(
    expect.arrayContaining([publicationId, "Ada", "Hello"]),
  );
});

it("fails loudly when the insert returns no row", async () => {
  execute.mockResolvedValue({ rows: [] });
  await expect(
    insertPublicationComment({ publicationId, parentId: null, name: "A", bodyMarkdown: "B" }),
  ).rejects.toThrow("Comment insert did not return content.");
});

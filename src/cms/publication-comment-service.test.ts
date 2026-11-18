import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/publication-comments", () => ({
  insertPublicationComment: vi.fn(),
  listPublicationComments: vi.fn(),
  readPublicationComment: vi.fn(),
}));
vi.mock("@/src/db/publications", () => ({ readPublication: vi.fn() }));
import {
  insertPublicationComment,
  listPublicationComments,
  readPublicationComment,
} from "@/src/db/publication-comments";
import { readPublication } from "@/src/db/publications";
import {
  postPublicationComment,
  readPublicationThreads,
} from "./publication-comment-service";
import type { PublicationComment } from "./publication-comments";

const pub = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";
const top = "22222222-2222-4222-8222-222222222222";
const reply = "33333333-3333-4333-8333-333333333333";
const row = (
  id: string,
  parentId: string | null,
  publicationId = pub,
  createdAt = "2026-01-01 10:00:00+00",
): PublicationComment => ({
  id,
  publicationId,
  parentId,
  name: "Ada",
  bodyMarkdown: "Hello",
  createdAt,
});
const published = { id: pub, draft: {}, published: {} } as never;
const input = { parentId: null, name: " Ada ", bodyMarkdown: " Hello " };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readPublication).mockResolvedValue(published);
  vi.mocked(listPublicationComments).mockResolvedValue([]);
});

it("groups flat rows into threads with ordered flat replies", async () => {
  vi.mocked(listPublicationComments).mockResolvedValue([
    row(top, null),
    row(reply, top, pub, "2026-01-02 10:00:00+00"),
  ]);
  const result = await readPublicationThreads(pub);
  expect(result).toEqual({
    ok: true,
    threads: [
      {
        id: top,
        name: "Ada",
        date: "2026-01-01T10:00:00.000Z",
        text: "Hello",
        replies: [
          {
            id: reply,
            name: "Ada",
            date: "2026-01-02T10:00:00.000Z",
            text: "Hello",
          },
        ],
      },
    ],
  });
});

it("hides comments for unpublished or absent publications", async () => {
  vi.mocked(readPublication).mockResolvedValue({
    id: pub,
    draft: {},
    published: null,
  } as never);
  expect(await readPublicationThreads(pub)).toMatchObject({
    ok: false,
    error: { code: "NOT_FOUND" },
  });
  vi.mocked(readPublication).mockResolvedValue(null);
  expect(await readPublicationThreads(pub)).toMatchObject({
    ok: false,
    error: { code: "NOT_FOUND" },
  });
});

it.each([
  ["blank name", { ...input, name: "  " }, "/name"],
  ["long name", { ...input, name: "x".repeat(81) }, "/name"],
  ["blank body", { ...input, bodyMarkdown: " \n " }, "/bodyMarkdown"],
  ["long body", { ...input, bodyMarkdown: "x".repeat(5001) }, "/bodyMarkdown"],
  ["bad parent id", { ...input, parentId: "nope" }, "/parentId"],
])(
  "rejects %s with field feedback and no persistence",
  async (_n, value, pointer) => {
    const result = await postPublicationComment(pub, value);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR", issues: [{ pointer }] },
    });
    expect(insertPublicationComment).not.toHaveBeenCalled();
  },
);

it("rejects posting to an unpublished publication without persistence", async () => {
  vi.mocked(readPublication).mockResolvedValue({
    id: pub,
    draft: {},
    published: null,
  } as never);
  expect(await postPublicationComment(pub, input)).toMatchObject({
    ok: false,
    error: { code: "NOT_FOUND" },
  });
  expect(insertPublicationComment).not.toHaveBeenCalled();
});

it("inserts a trimmed top-level comment and returns refreshed threads", async () => {
  vi.mocked(listPublicationComments).mockResolvedValue([row(top, null)]);
  const result = await postPublicationComment(pub, input);
  expect(insertPublicationComment).toHaveBeenCalledWith({
    publicationId: pub,
    parentId: null,
    name: "Ada",
    bodyMarkdown: "Hello",
  });
  expect(result).toMatchObject({ ok: true, threads: [{ id: top }] });
});

it("accepts a reply to a top-level comment on the same publication", async () => {
  vi.mocked(readPublicationComment).mockResolvedValue(row(top, null));
  const result = await postPublicationComment(pub, { ...input, parentId: top });
  expect(result.ok).toBe(true);
  expect(insertPublicationComment).toHaveBeenCalledWith(
    expect.objectContaining({ parentId: top }),
  );
});

it.each([
  ["missing parent", null, "was not found"],
  ["cross-publication parent", row(top, null, other), "was not found"],
  ["reply-to-reply", row(reply, top), "top-level"],
])("rejects %s without persistence", async (_n, parent, text) => {
  vi.mocked(readPublicationComment).mockResolvedValue(parent);
  const result = await postPublicationComment(pub, { ...input, parentId: top });
  expect(result).toMatchObject({
    ok: false,
    error: { code: "VALIDATION_ERROR", issues: [{ pointer: "/parentId" }] },
  });
  expect(JSON.stringify(result)).toContain(text);
  expect(insertPublicationComment).not.toHaveBeenCalled();
});

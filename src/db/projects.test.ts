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

import type { ProjectDraft } from "@/src/cms/projects";
import {
  deleteProject,
  deletePublishedProject,
  insertProject,
  listProjects,
  listPublishedProjects,
  readProject,
  reorderProjects,
  updateProject,
  upsertPublishedProject,
} from "./projects";

const id = "11111111-1111-4111-8111-111111111111";
const asset = "22222222-2222-4222-8222-222222222222";
const screenshotUrl = "https://cdn.example.com/screenshot.jpg";
const content = (name: string, screenshot: string): ProjectDraft => ({
  name,
  summary: "Summary",
  what: "What",
  how: "How",
  platform: "web",
  tagsText: "Tag one, Tag two",
  screenshot,
  screenshotAlt: "Interface",
  liveUrl: "https://example.com",
});
const snapshot = (name: string, screenshot: string) => [
  name,
  "Summary",
  "What",
  "How",
  "web",
  "Tag one, Tag two",
  screenshot,
  "Interface",
  "https://example.com",
];
const saved = [id, 2, ...snapshot("Saved edits", screenshotUrl)];
const live = [id, ...snapshot("Live version", screenshotUrl)];
const draftInput: ProjectDraft = { ...content("Draft", screenshotUrl) };
const inserted = [id, 0, ...snapshot("Draft", screenshotUrl)];

beforeEach(() => {
  execute.mockReset();
});

it("lists saved and published snapshots independently in stable editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  expect(await listProjects()).toEqual([
    {
      id,
      draft: content("Saved edits", screenshotUrl),
      published: content("Live version", screenshotUrl),
    },
  ]);
  expect(execute.mock.calls[0][0]).toContain(
    'order by "projects"."position" asc, "projects"."id" asc',
  );
});

it("lists only published projects, with id, in editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...live]] });
  expect(await listPublishedProjects()).toEqual([
    { id, ...content("Live version", screenshotUrl) },
  ]);
  expect(execute.mock.calls[0][0]).toBe(
    'select "published_projects"."project_id", "published_projects"."name", "published_projects"."summary", "published_projects"."what", "published_projects"."how", "published_projects"."platform", "published_projects"."tags_text", "published_projects"."screenshot", "published_projects"."screenshot_alt", "published_projects"."live_url" from "published_projects" inner join "projects" on "projects"."id" = "published_projects"."project_id" order by "projects"."position" asc, "projects"."id" asc',
  );
});

it("excludes a project with no published snapshot", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await listPublishedProjects()).toEqual([]);
});

it("preserves draft-only records and empty screenshot references", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("", ""), ...Array(10).fill(null)]],
  });
  expect(await readProject(id)).toEqual({
    id,
    draft: content("", ""),
    published: null,
  });
});

it("reads only the requested record with a bound ID", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  const value = await readProject(id);
  expect(value?.draft.name).toBe("Saved edits");
  expect(value?.published?.name).toBe("Live version");
  expect(execute.mock.calls[0][1]).toEqual([id]);
  expect(execute.mock.calls[0][0]).toContain('where "projects"."id" = $1');
});

it("returns an empty collection without sample records", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await listProjects()).toEqual([]);
});

it("returns null for a missing project", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await readProject(id)).toBeNull();
});

it("inserts an unfinished draft using database-generated identity and stores its screenshot URL", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await insertProject(draftInput)).toEqual({
    id,
    draft: content("Draft", screenshotUrl),
    published: null,
  });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^insert into "projects"/);
  expect(query).toContain("returning");
  expect(params).toEqual([
    "Draft",
    "Summary",
    "What",
    "How",
    "web",
    "Tag one, Tag two",
    screenshotUrl,
    "Interface",
    "https://example.com",
  ]);
});

it("stores an empty screenshot as an empty string, not null", async () => {
  execute.mockResolvedValue({ rows: [[id, 0, ...snapshot("Draft", "")]] });
  await insertProject({ ...draftInput, screenshot: "" });
  expect(execute.mock.calls[0][1][6]).toBe("");
});

it("updates only the requested saved draft and returns the stored record", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await updateProject(id, draftInput)).toEqual({
    id,
    draft: content("Draft", screenshotUrl),
    published: null,
  });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^update "projects"/);
  expect(query).toContain('where "projects"."id" = $10');
  expect(query).toContain("returning");
  expect(params).toEqual([
    "Draft",
    "Summary",
    "What",
    "How",
    "web",
    "Tag one, Tag two",
    screenshotUrl,
    "Interface",
    "https://example.com",
    id,
  ]);
});

it("returns null when an update finds no project", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await updateProject(id, draftInput)).toBeNull();
});

it("reports an insert without a returned row", async () => {
  execute.mockResolvedValue({ rows: [] });
  await expect(insertProject(draftInput)).rejects.toThrow(
    "Project insert did not return content.",
  );
});

it("inserts or replaces the published snapshot for the project identity", async () => {
  execute.mockResolvedValue({ rows: [live] });
  expect(
    await upsertPublishedProject(
      id,
      content("Live version", screenshotUrl),
    ),
  ).toEqual(content("Live version", screenshotUrl));
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^insert into "published_projects"/);
  expect(query).toContain('on conflict ("project_id") do update');
  expect(query).toContain("returning");
  expect(params).toEqual([
    id,
    "Live version",
    "Summary",
    "What",
    "How",
    "web",
    "Tag one, Tag two",
    screenshotUrl,
    "Interface",
    "https://example.com",
    "Live version",
    "Summary",
    "What",
    "How",
    "web",
    "Tag one, Tag two",
    screenshotUrl,
    "Interface",
    "https://example.com",
  ]);
});

it("returns null when published persistence returns no row", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(
    await upsertPublishedProject(id, content("Live version", "")),
  ).toBeNull();
});

it("deletes only the published snapshot and returns its stored content", async () => {
  execute.mockResolvedValue({ rows: [live] });
  expect(await deletePublishedProject(id)).toEqual(
    content("Live version", screenshotUrl),
  );
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^delete from "published_projects"/);
  expect(query).toContain('where "published_projects"."project_id" = $1');
  expect(query).toContain("returning");
  expect(params).toEqual([id]);
});

it("returns null when no published snapshot exists", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await deletePublishedProject(id)).toBeNull();
});

it("deletes only the requested project, leaving media untouched and snapshot removal to the database cascade", async () => {
  execute.mockResolvedValue({ rows: [[id]] });
  expect(await deleteProject(id)).toBe(id);
  expect(execute).toHaveBeenCalledTimes(1);
  const [query, params] = execute.mock.calls[0];
  expect(query).toBe(
    'delete from "projects" where "projects"."id" = $1 returning "id"',
  );
  expect(params).toEqual([id]);
});

it("returns null when deleting a missing project", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await deleteProject(id)).toBeNull();
});

it("propagates project deletion failures rather than reporting success", async () => {
  const failure = new Error("Database unavailable");
  execute.mockRejectedValue(failure);
  await expect(deleteProject(id)).rejects.toMatchObject({ cause: failure });
});

it.each(["list", "read"])(
  "propagates %s database failures",
  async (operation) => {
    const failure = new Error("Database unavailable");
    execute.mockRejectedValue(failure);
    await expect(
      operation === "list" ? listProjects() : readProject(id),
    ).rejects.toMatchObject({ cause: failure });
  },
);

it("persists the complete requested order using bound IDs and only updates positions", async () => {
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[id], [asset]] })
    .mockResolvedValueOnce({ rows: [] });
  expect(await reorderProjects([asset, id])).toEqual({ status: "saved" });
  const [lock, membership, update] = execute.mock.calls;
  expect(lock[0]).toBe('lock table "projects" in share row exclusive mode');
  expect(membership[0]).toBe('select "id" from "projects"');
  expect(update[0]).toBe(
    'update "projects" set "position" = case "projects"."id" when $1::uuid then $2::integer when $3::uuid then $4::integer end',
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
  expect(await reorderProjects(ids)).toEqual({ status: "conflict" });
  expect(execute.mock.calls.some(([query]) => query.startsWith("update "))).toBe(false);
});

it("accepts an empty ordering only when the collection is empty", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await reorderProjects([])).toEqual({ status: "saved" });
  expect(execute.mock.calls.some(([query]) => query.startsWith("update "))).toBe(false);
});

it("rejects an unknown ID in an empty collection", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await reorderProjects([id])).toEqual({ status: "conflict" });
});

it("compares UUID identity without case sensitivity", async () => {
  const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[uuid]] })
    .mockResolvedValueOnce({ rows: [] });
  expect(await reorderProjects([uuid.toUpperCase()])).toEqual({ status: "saved" });
  expect(execute.mock.calls[2][1]).toEqual([uuid, 0]);
});

it("rejects duplicate UUID identities even with different casing", async () => {
  const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  expect(await reorderProjects([uuid, uuid.toUpperCase()])).toEqual({ status: "conflict" });
  expect(execute).not.toHaveBeenCalled();
});

it("repeating an order assigns the same positions", async () => {
  execute.mockImplementation(async (query: string) => ({
    rows: query.startsWith("select ") ? [[id], [asset]] : [],
  }));
  expect(await reorderProjects([asset, id])).toEqual({ status: "saved" });
  expect(await reorderProjects([asset, id])).toEqual({ status: "saved" });
  const updates = execute.mock.calls.filter(([query]) => query.startsWith("update "));
  expect(updates.map(([, params]) => params)).toEqual([
    [asset, 0, id, 1],
    [asset, 0, id, 1],
  ]);
});

it.each(["lock", "membership"])("does not write when %s fails", async (stage) => {
  const failure = new Error("Database unavailable");
  if (stage === "membership") execute.mockResolvedValueOnce({ rows: [] });
  execute.mockRejectedValueOnce(failure);
  await expect(reorderProjects([id])).rejects.toMatchObject({ cause: failure });
  expect(execute.mock.calls.some(([query]) => query.startsWith("update "))).toBe(false);
});

it("propagates a failed ordering write instead of reporting success", async () => {
  const failure = new Error("Write failed");
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [[id], [asset]] })
    .mockRejectedValueOnce(failure);
  await expect(reorderProjects([asset, id])).rejects.toMatchObject({ cause: failure });
});

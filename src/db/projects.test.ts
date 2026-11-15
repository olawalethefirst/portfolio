import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import type { ProjectDraft } from "@/src/cms/projects";
import {
  deleteProject,
  deletePublishedProject,
  insertProject,
  listProjects,
  readProject,
  updateProject,
  upsertPublishedProject,
} from "./projects";

const id = "11111111-1111-4111-8111-111111111111";
const asset = "22222222-2222-4222-8222-222222222222";
const content = (name: string, screenshot: string): ProjectDraft => ({
  name,
  summary: "Summary",
  what: "What",
  how: "How",
  platform: "web",
  screenshot,
  screenshotAlt: "Interface",
  liveUrl: "https://example.com",
});
const snapshot = (name: string, image: string | null) => [
  name,
  "Summary",
  "What",
  "How",
  "web",
  image,
  "Interface",
  "https://example.com",
];
const saved = [id, 2, ...snapshot("Saved edits", asset)];
const live = [id, ...snapshot("Live version", asset)];
const draftInput: ProjectDraft = { ...content("Draft", `/media/${asset}`) };
const inserted = [id, 0, ...snapshot("Draft", asset)];

beforeEach(() => {
  execute.mockReset();
});

it("lists saved and published snapshots independently in stable editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  expect(await listProjects()).toEqual([
    {
      id,
      draft: content("Saved edits", `/media/${asset}`),
      published: content("Live version", `/media/${asset}`),
    },
  ]);
  expect(execute.mock.calls[0][0]).toContain(
    'order by "projects"."position" asc, "projects"."id" asc',
  );
});

it("preserves draft-only records and empty screenshot references", async () => {
  execute.mockResolvedValue({
    rows: [[id, 0, ...snapshot("", null), ...Array(9).fill(null)]],
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

it("inserts an unfinished draft using database-generated identity and maps its asset reference", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await insertProject(draftInput)).toEqual({
    id,
    draft: content("Draft", `/media/${asset}`),
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
    asset,
    "Interface",
    "https://example.com",
  ]);
});

it("stores an empty screenshot as a null asset reference", async () => {
  execute.mockResolvedValue({ rows: [[id, 0, ...snapshot("Draft", null)]] });
  await insertProject({ ...draftInput, screenshot: "" });
  expect(execute.mock.calls[0][1][5]).toBeNull();
});

it("updates only the requested saved draft and returns the stored record", async () => {
  execute.mockResolvedValue({ rows: [inserted] });
  expect(await updateProject(id, draftInput)).toEqual({
    id,
    draft: content("Draft", `/media/${asset}`),
    published: null,
  });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^update "projects"/);
  expect(query).toContain('where "projects"."id" = $9');
  expect(query).toContain("returning");
  expect(params).toEqual([
    "Draft",
    "Summary",
    "What",
    "How",
    "web",
    asset,
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
      content("Live version", `/media/${asset}`),
    ),
  ).toEqual(content("Live version", `/media/${asset}`));
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
    asset,
    "Interface",
    "https://example.com",
    "Live version",
    "Summary",
    "What",
    "How",
    "web",
    asset,
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
    content("Live version", `/media/${asset}`),
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

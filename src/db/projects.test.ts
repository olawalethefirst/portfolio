import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import { listProjects, readProject } from "./projects";

const id = "11111111-1111-4111-8111-111111111111";
const asset = "22222222-2222-4222-8222-222222222222";
const content = (name: string, screenshot: string) => ({
  name, summary: "Summary", what: "What", how: "How", platform: "web",
  screenshot, screenshotAlt: "Interface", liveUrl: "https://example.com",
});
const snapshot = (name: string, image: string | null) =>
  [name, "Summary", "What", "How", "web", image, "Interface", "https://example.com"];
const saved = [id, 2, ...snapshot("Saved edits", asset)];
const live = [id, ...snapshot("Live version", asset)];

beforeEach(() => { execute.mockReset(); });

it("lists saved and published snapshots independently in stable editorial order", async () => {
  execute.mockResolvedValue({ rows: [[...saved, ...live]] });
  expect(await listProjects()).toEqual([{
    id, draft: content("Saved edits", `/media/${asset}`),
    published: content("Live version", `/media/${asset}`),
  }]);
  expect(execute.mock.calls[0][0]).toContain('order by "projects"."position" asc, "projects"."id" asc');
});

it("preserves draft-only records and empty screenshot references", async () => {
  execute.mockResolvedValue({ rows: [[id, 0, ...snapshot("", null), ...Array(9).fill(null)]] });
  expect(await readProject(id)).toEqual({ id, draft: content("", ""), published: null });
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

it.each(["list", "read"])("propagates %s database failures", async (operation) => {
  const failure = new Error("Database unavailable");
  execute.mockRejectedValue(failure);
  await expect(operation === "list" ? listProjects() : readProject(id))
    .rejects.toMatchObject({ cause: failure });
});

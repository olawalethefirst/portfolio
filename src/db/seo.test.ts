import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import { listSeo, readSeo } from "./seo";

const defaults = { id: "00000000-0000-4000-8000-000000000001", path: "/", title: "Portfolio", description: "Default description" };
const override = { id: "00000000-0000-4000-8000-000000000002", path: "/contact", title: "", description: "Contact description" };
const row = (value: typeof defaults) => [value.id, value.path, value.title, value.description];
beforeEach(() => { execute.mockReset(); });

it("lists defaults and overrides with stable path ordering and preserves blank override fields", async () => {
  execute.mockResolvedValue({ rows: [row(defaults), row(override)] });
  expect(await listSeo()).toEqual([defaults, override]);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('from "seo"');
  expect(sql).toContain('order by "seo"."path" asc');
  expect(sql).not.toContain("limit");
  expect(params).toEqual([]);
});

it("returns an empty collection without inserting or inventing defaults", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await listSeo()).toEqual([]);
  expect(execute).toHaveBeenCalledTimes(1);
});

it.each([defaults, override])("reads saved SEO record $path by its persistent ID", async (value) => {
  execute.mockResolvedValue({ rows: [row(value)] });
  expect(await readSeo(value.id)).toEqual(value);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('where "seo"."id" = $1');
  expect(sql).not.toContain(value.id);
  expect(params).toEqual([value.id]);
});

it("returns null when a requested record is absent", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await readSeo(override.id)).toBeNull();
});

it.each(["list", "read"])("propagates %s database failures without substituting samples", async (operation) => {
  const failure = new Error("Database unavailable");
  execute.mockRejectedValue(failure);
  await expect(operation === "list" ? listSeo() : readSeo(defaults.id)).rejects.toMatchObject({ cause: failure });
});

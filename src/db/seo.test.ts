import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import { insertSeo, listSeo, readSeo, updateSeo } from "./seo";

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


it("inserts only editable values, lets the database generate identity and returns canonical content", async () => {
  const input = { path: "/new", title: "  Literal title  ", description: "'); drop table seo; --", id: "client-id", updated_at: "client-time" };
  const canonical = { ...override, path: "/new", title: "Canonical title" };
  execute.mockResolvedValue({ rows: [row(canonical)] });
  expect(await insertSeo(input)).toEqual(canonical);
  expect(execute).toHaveBeenCalledTimes(1);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toMatch(/^insert into "seo"/);
  expect(sql).toContain("returning");
  expect(sql).not.toContain(input.description);
  expect(params).toEqual([input.path, input.title, input.description]);
});

it.each([defaults, override])("updates existing SEO $path by ID with canonical returned values", async (record) => {
  const input = { path: record.path, title: "  Saved title  ", description: "Saved description" };
  const canonical = { ...record, ...input, title: "Canonical title" };
  execute.mockResolvedValue({ rows: [row(canonical)] });
  expect(await updateSeo(record.id, input)).toEqual(canonical);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toMatch(/^update "seo"/);
  expect(sql).toContain('where "seo"."id" = $4');
  expect(sql).toContain("returning");
  expect(params).toEqual([input.path, input.title, input.description, record.id]);
});

it("does not create content when an update finds no record", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await updateSeo(override.id, override)).toBeNull();
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute.mock.calls[0][0]).toMatch(/^update /);
});

it("reports an unexpected insert without a returned row", async () => {
  execute.mockResolvedValue({ rows: [] });
  await expect(insertSeo(override)).rejects.toThrow("SEO insert did not return content.");
});

it.each(["insert", "update"])("retains uniqueness violations from %s for service conflict handling", async (operation) => {
  const failure = Object.assign(new Error("Duplicate path"), { code: "23505", constraint: "seo_path_key" });
  execute.mockRejectedValue(failure);
  await expect(operation === "insert" ? insertSeo(override) : updateSeo(override.id, override)).rejects.toMatchObject({ cause: failure });
});

it.each(["insert", "update"])("propagates unexpected %s failures without fallback writes", async (operation) => {
  const failure = new Error("Database unavailable");
  execute.mockRejectedValue(failure);
  await expect(operation === "insert" ? insertSeo(override) : updateSeo(override.id, override)).rejects.toMatchObject({ cause: failure });
  expect(execute).toHaveBeenCalledTimes(1);
});

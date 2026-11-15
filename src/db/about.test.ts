import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import { readAbout, updateAbout } from "./about";

beforeEach(() => { execute.mockReset(); });

it("reads only the configured singleton and exposes its editable content", async () => {
  execute.mockResolvedValue({ rows: [[1, "Saved heading", "Saved biography"]] });
  expect(await readAbout()).toEqual({ heading: "Saved heading", biography: "Saved biography" });
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('from "about_content"');
  expect(sql).toContain('where "about_content"."id" = $1');
  expect(params).toEqual([1]);
});

it("reports an absent singleton without inventing sample content", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await readAbout()).toBeNull();
});

it("persists literal input through parameters and returns canonical database content", async () => {
  const value = { heading: "  Saved heading  ", biography: "'); drop table about_content; --\nBiography" };
  execute.mockResolvedValue({ rows: [[1, "Canonical heading", value.biography]] });
  expect(await updateAbout(value)).toEqual({ heading: "Canonical heading", biography: value.biography });
  expect(execute).toHaveBeenCalledTimes(1);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('update "about_content"');
  expect(sql).toContain('where "about_content"."id" = $3');
  expect(sql).toContain('returning');
  expect(sql).not.toContain(value.biography);
  expect(params).toEqual([value.heading, value.biography, 1]);
});

it("does not recreate missing content when an update finds no row", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await updateAbout({ heading: "Heading", biography: "Biography" })).toBeNull();
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute.mock.calls[0][0]).toMatch(/^update /);
});

it.each(["read", "update"])("propagates %s failures for the service/HTTP boundary", async (operation) => {
  execute.mockRejectedValue(new Error("Database unavailable"));
  const request = operation === "read" ? readAbout() : updateAbout({ heading: "Heading", biography: "Biography" });
  await expect(request).rejects.toThrow();
});

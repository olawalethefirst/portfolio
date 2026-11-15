import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import { readSocial, updateSocial } from "./social";

const saved = {
  github: "https://github.com/maker",
  linkedin: "https://www.linkedin.com/in/maker",
  x: "https://x.com/maker",
};

beforeEach(() => { execute.mockReset(); });

it("reads the fixed singleton and exposes only editable social destinations", async () => {
  execute.mockResolvedValue({ rows: [[1, saved.github, saved.linkedin, saved.x]] });
  expect(await readSocial()).toEqual(saved);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('from "social_content"');
  expect(sql).toContain('where "social_content"."id" = $1');
  expect(params).toEqual([1]);
});

it("reports missing saved destinations without substituting sample profiles", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await readSocial()).toBeNull();
});

it("writes all destinations as literal parameters and returns canonical database content", async () => {
  const input = { ...saved, github: "https://example.com/'); drop table social_content; --" };
  execute.mockResolvedValue({ rows: [[1, saved.github, saved.linkedin, saved.x]] });
  expect(await updateSocial(input)).toEqual(saved);
  expect(execute).toHaveBeenCalledTimes(1);
  const [sql, params] = execute.mock.calls[0];
  expect(sql).toContain('update "social_content"');
  expect(sql).toContain('where "social_content"."id" = $4');
  expect(sql).toContain("returning");
  expect(sql).not.toContain(input.github);
  expect(params).toEqual([input.github, input.linkedin, input.x, 1]);
});

it("does not insert or recreate a missing singleton during update", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await updateSocial(saved)).toBeNull();
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute.mock.calls[0][0]).toMatch(/^update /);
});

it.each(["read", "update"])("propagates %s database failures to the caller", async (operation) => {
  const failure = new Error("Database unavailable");
  execute.mockRejectedValue(failure);
  await expect(operation === "read" ? readSocial() : updateSocial(saved)).rejects.toMatchObject({ cause: failure });
});

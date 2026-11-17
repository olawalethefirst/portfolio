import { beforeEach, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getDb: () => drizzle(execute) }));

import { getDb } from "./client";
import { isAssetRegistered, registerAsset } from "./assets";

const id = "11111111-1111-4111-8111-111111111111";
const bucket = "portfolio-media";
const objectKey = `${id}.jpg`;

beforeEach(() => {
  execute.mockReset();
});

it("reports a registered asset", async () => {
  execute.mockResolvedValue({ rows: [[id]] });
  expect(await isAssetRegistered(getDb(), id)).toBe(true);
  expect(execute.mock.calls[0][0]).toContain('where "media_assets"."id" = $1');
  expect(execute.mock.calls[0][1]).toEqual([id]);
});

it("reports an unregistered asset", async () => {
  execute.mockResolvedValue({ rows: [] });
  expect(await isAssetRegistered(getDb(), id)).toBe(false);
});

it("registers a new asset by its pre-generated id", async () => {
  execute.mockResolvedValue({ rows: [] });
  await registerAsset(getDb(), { id, bucket, objectKey });
  const [query, params] = execute.mock.calls[0];
  expect(query).toMatch(/^insert into "media_assets"/);
  expect(query).toContain("on conflict");
  expect(params).toEqual([id, bucket, objectKey]);
});

it("does nothing when the same asset id is registered twice", async () => {
  execute.mockResolvedValue({ rows: [] });
  await expect(
    registerAsset(getDb(), { id, bucket, objectKey }),
  ).resolves.toBeUndefined();
});

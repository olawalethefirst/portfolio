import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { create, info, from, getDb, isAssetRegistered } = vi.hoisted(() => ({
  create: vi.fn(),
  info: vi.fn(),
  from: vi.fn(),
  getDb: vi.fn(() => "db"),
  isAssetRegistered: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
vi.mock("@/src/db/client", () => ({ getDb }));
vi.mock("@/src/db/assets", () => ({ isAssetRegistered, registerAsset: vi.fn() }));

import { resolveAssetReferences } from "./asset-association";

const id = "11111111-1111-4111-8111-111111111111";
const publicUrl = `https://example.supabase.co/storage/v1/object/public/media/${id}.jpg`;
const canonicalUrl = `/media/${id}`;

beforeEach(() => {
  vi.resetAllMocks();
  getDb.mockReturnValue("db");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_API_KEY", "server-secret");
  vi.stubEnv("SUPABASE_STORAGE_BUCKET", "media");
  from.mockReturnValue({ info });
  create.mockReturnValue({ storage: { from } });
});
afterEach(() => vi.unstubAllEnvs());

it("resolves an empty source to no asset", async () => {
  expect(await resolveAssetReferences([""])).toEqual([{ assetId: null }]);
  expect(isAssetRegistered).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it("resolves an already-registered canonical reference without a storage round trip", async () => {
  isAssetRegistered.mockResolvedValue(true);
  expect(await resolveAssetReferences([canonicalUrl])).toEqual([
    { assetId: id, registration: null },
  ]);
  expect(create).not.toHaveBeenCalled();
});

it("rejects an unregistered canonical reference", async () => {
  isAssetRegistered.mockResolvedValue(false);
  await expect(resolveAssetReferences([canonicalUrl])).rejects.toThrow(
    "Referenced image could not be verified. Try uploading it again.",
  );
});

it("resolves an already-registered public-URL reference without a storage round trip", async () => {
  isAssetRegistered.mockResolvedValue(true);
  expect(await resolveAssetReferences([publicUrl])).toEqual([
    { assetId: id, registration: null },
  ]);
  expect(info).not.toHaveBeenCalled();
});

it("verifies and resolves a newly uploaded public-URL reference for registration", async () => {
  isAssetRegistered.mockResolvedValue(false);
  info.mockResolvedValue({ data: { size: 1024 }, error: null });
  expect(await resolveAssetReferences([publicUrl])).toEqual([
    { assetId: id, registration: { bucket: "media", objectKey: `${id}.jpg` } },
  ]);
  expect(info).toHaveBeenCalledWith(`${id}.jpg`);
});

it.each([
  { data: null, error: { message: "not found" } },
  { data: { size: 0 }, error: null },
  { data: { size: 11 * 1024 * 1024 }, error: null },
])("rejects a newly referenced object that fails verification", async (result) => {
  isAssetRegistered.mockResolvedValue(false);
  info.mockResolvedValue(result);
  await expect(resolveAssetReferences([publicUrl])).rejects.toThrow(
    "Referenced image could not be verified. Try uploading it again.",
  );
});

it("rejects a reference that matches neither the canonical nor public-URL shape", async () => {
  isAssetRegistered.mockResolvedValue(false);
  await expect(
    resolveAssetReferences(["https://example.com/random.jpg"]),
  ).rejects.toThrow("Referenced image could not be verified. Try uploading it again.");
});

it("fails closed when storage is not configured for an unregistered reference", async () => {
  vi.stubEnv("SUPABASE_URL", " ");
  isAssetRegistered.mockResolvedValue(false);
  await expect(resolveAssetReferences([publicUrl])).rejects.toThrow(
    "Storage is not configured.",
  );
});

it("resolves multiple sources with bounded concurrency", async () => {
  isAssetRegistered.mockResolvedValue(false);
  let inFlight = 0;
  let maxInFlight = 0;
  info.mockImplementation(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return { data: { size: 1024 }, error: null };
  });
  const ids = Array.from({ length: 6 }, (_, index) => `${index}`.padStart(8, "0") + "-1111-4111-8111-111111111111");
  const sources = ids.map((assetId) => `https://example.supabase.co/storage/v1/object/public/media/${assetId}.jpg`);
  const resolved = await resolveAssetReferences(sources, 2);
  expect(resolved).toHaveLength(6);
  expect(maxInFlight).toBeLessThanOrEqual(2);
});

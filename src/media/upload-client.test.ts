import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { create, upload, from, publicUrl } = vi.hoisted(() => ({ create: vi.fn(), upload: vi.fn(), from: vi.fn(), publicUrl: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
import { uploadImage } from "./upload-client";
const id = "12345678-1234-4234-8234-123456789abc";
const permission = { assetId: id, bucket: "media", path: `${id}.png`, token: "signed" };
const config = { url: "https://example.supabase.co", publishableKey: "public" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(permission)));
  upload.mockResolvedValue({ data: { path: permission.path }, error: null });
  publicUrl.mockReturnValue({ data: { publicUrl: `${config.url}/storage/v1/object/public/media/${permission.path}` } });
  from.mockReturnValue({ uploadToSignedUrl: upload, getPublicUrl: publicUrl });
  create.mockReturnValue({ storage: { from } });
});
afterEach(() => vi.unstubAllGlobals());
it("uploads directly and returns only durable preview/reference data", async () => {
  const file = new File(["image"], "image.png", { type: "image/png" });
  const result = await uploadImage(file, config);
  expect(result).toEqual({ source: `${config.url}/storage/v1/object/public/media/${permission.path}`, descriptor: { assetId: id, bucket: "media", path: permission.path } });
  expect(upload).toHaveBeenCalledWith(permission.path, "signed", file, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
});
it.each(["text/plain", "image/svg+xml"])("rejects unsupported %s before networking", async (type) => {
  await expect(uploadImage(new File(["x"], "x", { type }), config)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it.each([0, 10485761])("rejects size %i before networking", async (size) => {
  const file = new File(["x"], "x.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  await expect(uploadImage(file, config)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects a mismatched permission path before upload", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...permission, path: "other.png" }));
  await expect(uploadImage(new File(["x"], "x.png", { type: "image/png" }), config)).rejects.toThrow();
  expect(upload).not.toHaveBeenCalled();
});
it("hides storage errors and does not automatically retry", async () => {
  upload.mockResolvedValue({ data: null, error: { message: "secret-provider-message" } });
  await expect(uploadImage(new File(["x"], "x.png", { type: "image/png" }), config)).rejects.toThrow("Upload failed. Retry or choose another image.");
  expect(upload).toHaveBeenCalledTimes(1);
});

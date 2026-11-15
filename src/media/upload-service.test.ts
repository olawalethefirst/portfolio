import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { create, sign, from } = vi.hoisted(() => ({ create: vi.fn(), sign: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
import { issueUploadPermission } from "./upload-service";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_API_KEY", "server-secret");
  vi.stubEnv("SUPABASE_STORAGE_BUCKET", "media");
  from.mockReturnValue({ createSignedUploadUrl: sign });
  create.mockReturnValue({ storage: { from } });
  sign.mockImplementation(async (path) => ({ data: { path, token: "signed-token", signedUrl: "unused" }, error: null }));
});
afterEach(() => vi.unstubAllEnvs());

it.each([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]] as const)(
  "issues unique server-owned %s paths without overwrite", async (type, extension) => {
    const first = await issueUploadPermission(type);
    const second = await issueUploadPermission(type);
    expect(first).toEqual({ assetId: expect.stringMatching(/^[\da-f-]{36}$/), bucket: "media", path: `${first.assetId}.${extension}`, token: "signed-token" });
    expect(second.path).not.toBe(first.path);
    expect(sign).toHaveBeenCalledWith(first.path, { upsert: false });
    expect(from).toHaveBeenCalledWith("media");
    expect(create).toHaveBeenCalledWith("https://example.supabase.co", "server-secret", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  },
);
it.each(["SUPABASE_URL", "SUPABASE_SECRET_API_KEY", "SUPABASE_STORAGE_BUCKET"])("fails closed without %s", async (name) => {
  vi.stubEnv(name, " ");
  await expect(issueUploadPermission("image/png")).rejects.toThrow();
  expect(sign).not.toHaveBeenCalled();
});
it.each([
  { data: null, error: { message: "provider secret" } },
  { data: { path: "wrong-path", token: "token" }, error: null },
  { data: null, error: null },
  { data: { token: "" }, error: null },
])("rejects failed or invalid signing results", async (result) => {
  sign.mockResolvedValue(result);
  await expect(issueUploadPermission("image/png")).rejects.toThrow();
});

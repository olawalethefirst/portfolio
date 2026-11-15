import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
const { issue, client, getUser } = vi.hoisted(() => ({ issue: vi.fn(), client: vi.fn(), getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/media/upload-service", () => ({ issueUploadPermission: issue }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { POST } from "./route";
const permission = { assetId: "generated-id", bucket: "media", path: "generated-id.png", token: "signed-token" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  issue.mockResolvedValue(permission);
});
afterEach(() => vi.unstubAllEnvs());
function request(body: unknown = { contentType: "image/png", size: 123 }, headers: Record<string, string> = {}) {
  return new NextRequest("https://portfolio.test/api/admin/media/uploads", {
    method: "POST", body: JSON.stringify(body),
    headers: { origin: "https://portfolio.test", "content-type": "application/json", ...headers },
  });
}
it("returns an uncached permission to the owner", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(permission);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it.each([[null, 401], [{ id: "other" }, 403]] as const)("denies unauthorized identities", async (user, status) => {
  getUser.mockResolvedValue({ data: { user }, error: null });
  expect((await POST(request())).status).toBe(status);
  expect(issue).not.toHaveBeenCalled();
});
it("fails closed without owner configuration", async () => {
  vi.stubEnv("ADMIN_USER_ID", "");
  expect((await POST(request())).status).toBe(500);
  expect(issue).not.toHaveBeenCalled();
});
it.each(["https://other.test", "null", ""])("rejects origin %s before auth/signing", async (origin) => {
  expect((await POST(request(undefined, { origin }))).status).toBe(403);
  expect(client).not.toHaveBeenCalled();
  expect(issue).not.toHaveBeenCalled();
});
it("rejects missing Origin", async () => {
  const incoming = request(); incoming.headers.delete("origin");
  expect((await POST(incoming)).status).toBe(403);
  expect(issue).not.toHaveBeenCalled();
});
it.each([null, [], {}, { contentType: "image/png" }, { contentType: 1, size: 1 }, { contentType: "image/png", size: "1" }, { contentType: "image/png", size: 1.5 }, { contentType: "image/png", size: 1, path: "overwrite" }])("rejects invalid structure %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(issue).not.toHaveBeenCalled();
});
it.each([["image/svg+xml", 1, "/contentType"], ["image/png", 0, "/size"], ["image/png", -1, "/size"], ["image/png", 10485761, "/size"]])("rejects invalid upload metadata", async (contentType, size, pointer) => {
  const response = await POST(request({ contentType, size }));
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR", issues: expect.arrayContaining([{ pointer, message: expect.any(String) }]) } });
  expect(issue).not.toHaveBeenCalled();
});
it.each([1, 10485760])("accepts boundary size %i", async (size) => {
  expect((await POST(request({ contentType: "image/png", size }))).status).toBe(200);
});
it("requires JSON and rejects malformed JSON", async () => {
  expect((await POST(request(undefined, { "content-type": "text/plain" }))).status).toBe(400);
  const incoming = request();
  const malformed = new NextRequest(incoming.url, { method: "POST", headers: incoming.headers, body: "{" });
  expect((await POST(malformed)).status).toBe(400);
  expect(issue).not.toHaveBeenCalled();
});
it.each([false, true])("preserves session writes on signing success/failure (%s)", async (fails) => {
  client.mockImplementation((_cookies, response: NextResponse) => {
    response.cookies.set("session", "refreshed", { httpOnly: true });
    response.headers.set("X-Session-Test", "updated");
    return { auth: { getUser } };
  });
  if (fails) issue.mockRejectedValue(new Error("provider-secret"));
  const response = await POST(request());
  expect(response.status).toBe(fails ? 500 : 200);
  expect(response.headers.get("set-cookie")).toContain("session=refreshed");
  expect(response.headers.get("X-Session-Test")).toBe("updated");
  if (fails) expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later." } });
});

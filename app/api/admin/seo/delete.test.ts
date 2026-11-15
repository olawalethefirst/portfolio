import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const { read, remove, getUser, client } = vi.hoisted(() => ({ read: vi.fn(), remove: vi.fn(), getUser: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/seo", () => ({ readSeo: read, deleteSeoOverride: remove, insertSeo: vi.fn(), updateSeo: vi.fn() }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { DELETE } from "./[id]/route";

const saved = { id: "00000000-0000-4000-8000-000000000002", path: "/contact", title: "Contact", description: "" };
const context = (id = saved.id) => ({ params: Promise.resolve({ id }) });
function request(origin: string | null = "https://portfolio.test") {
  return new NextRequest(`https://portfolio.test/api/admin/seo/${saved.id}`, { method: "DELETE", headers: origin === null ? {} : { origin } });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  read.mockResolvedValue(saved); remove.mockResolvedValue(saved);
});
afterEach(() => vi.unstubAllEnvs());

it("deletes an override by route UUID with empty 204 and no JSON requirement", async () => {
  const response = await DELETE(request(), context());
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(response.headers.get("content-type")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(remove).toHaveBeenCalledExactlyOnceWith(saved.id);
});
it("rejects default deletion with 409 and never deletes it", async () => {
  read.mockResolvedValue({ ...saved, path: "/" });
  const response = await DELETE(request(), context());
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: { code: "CONFLICT", message: "The default SEO record cannot be deleted." } });
  expect(remove).not.toHaveBeenCalled();
});
it.each(["before", "during"])("returns 404 when target disappears %s deletion", async (when) => {
  if (when === "before") read.mockResolvedValue(null); else remove.mockResolvedValue(null);
  const response = await DELETE(request(), context());
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
});
it.each(["defaults", "contact", "not-a-uuid"])("rejects malformed ID %s before database access", async (id) => {
  const response = await DELETE(request(), context(id));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  expect(read).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});
it.each([401, 403])("rejects unauthorized deletion with %s and no database access", async (status) => {
  getUser.mockResolvedValue({ data: { user: status === 401 ? null : { id: "other" } }, error: null });
  expect((await DELETE(request(), context())).status).toBe(status);
  expect(read).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});
it.each([null, "", "null", "https://other.test"])("rejects invalid origin %s before authentication", async (origin) => {
  expect((await DELETE(request(origin), context())).status).toBe(403);
  expect(client).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});
it("fails closed on missing owner configuration", async () => {
  vi.stubEnv("ADMIN_USER_ID", " ");
  expect((await DELETE(request(), context())).status).toBe(500);
  expect(read).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});
it.each(["read", "delete"])("hides unexpected %s failures", async (operation) => {
  (operation === "read" ? read : remove).mockRejectedValue(new Error("private SQL"));
  const response = await DELETE(request(), context());
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later." } });
});
it.each([false, true])("retains session writes and private caching on failure: %s", async (fails) => {
  client.mockImplementation((_cookies: unknown, session: NextResponse) => {
    session.cookies.set("session", "refreshed", { httpOnly: true, path: "/" });
    session.headers.set("x-session-refreshed", "true");
    return { auth: { getUser } };
  });
  if (fails) remove.mockRejectedValue(new Error("Database unavailable"));
  const response = await DELETE(request(), context());
  expect(response.status).toBe(fails ? 500 : 204);
  expect(response.headers.getSetCookie()).toEqual(expect.arrayContaining([expect.stringMatching(/^session=refreshed;/)]));
  expect(response.headers.get("x-session-refreshed")).toBe("true");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

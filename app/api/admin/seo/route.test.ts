import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const { list, read, getUser, client } = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), getUser: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/seo", () => ({ listSeo: list, readSeo: read }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { GET as collection } from "./route";
import { GET as item } from "./[id]/route";

const defaults = { id: "00000000-0000-4000-8000-000000000001", path: "/", title: "Portfolio", description: "Default description" };
const override = { ...defaults, id: "00000000-0000-4000-8000-000000000002", path: "/contact", title: "", description: "Contact description" };
const request = () => new NextRequest("https://portfolio.test/api/admin/seo");
const context = (id = defaults.id) => ({ params: Promise.resolve({ id }) });
const handlers = [() => collection(request()), () => item(request(), context())];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  list.mockResolvedValue([defaults, override]);
  read.mockResolvedValue(defaults);
});
afterEach(() => vi.unstubAllEnvs());

it("returns the complete direct collection including default and blank override values", async () => {
  const response = await collection(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([defaults, override]);
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns an empty collection without manufacturing a default record", async () => {
  list.mockResolvedValue([]);
  expect(await (await collection(request())).json()).toEqual([]);
});

it.each([defaults, override])("returns canonical item $path by persistent ID", async (record) => {
  read.mockResolvedValue(record);
  const response = await item(request(), context(record.id));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(record);
  expect(read).toHaveBeenCalledExactlyOnceWith(record.id);
});

it.each(["", "defaults", "contact", "not-a-uuid", "'; drop table seo; --"])("rejects invalid route ID without querying: %s", async (id) => {
  const response = await item(request(), context(id));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  expect(read).not.toHaveBeenCalled();
});

it("returns NOT_FOUND for an absent UUID", async () => {
  read.mockResolvedValue(null);
  const response = await item(request(), context());
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
});

it.each(handlers)("returns saved content without identity or configured owner", async (handle) => {
  vi.stubEnv("ADMIN_USER_ID", "");
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await handle()).status).toBe(200);
  expect(client).not.toHaveBeenCalled();
});

it.each(handlers)("returns the same public content for non-owner callers", async (handle) => {
  getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  expect((await handle()).status).toBe(200);
  expect(client).not.toHaveBeenCalled();
});

it.each(handlers)("hides database errors", async (handle) => {
  list.mockRejectedValue(new Error("private database information"));
  read.mockRejectedValue(new Error("private database information"));
  const response = await handle();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later." } });
});

it.each(handlers)("does not depend on provider setup", async (handle) => {
  client.mockImplementation(() => { throw new Error("private configuration"); });
  const response = await handle();
  expect(response.status).toBe(200);
  expect(client).not.toHaveBeenCalled();
});

it.each([false, true])("does not create sessions on public read success/failure: %s", async (fails) => {
  client.mockImplementation((_cookies: unknown, session: NextResponse) => {
    session.cookies.set("session", "refreshed", { httpOnly: true, path: "/" });
    session.headers.set("x-session-refreshed", "true");
    return { auth: { getUser } };
  });
  if (fails) { list.mockRejectedValue(new Error("DB failed")); read.mockRejectedValue(new Error("DB failed")); }
  for (const handle of handlers) {
    const response = await handle();
    expect(response.status).toBe(fails ? 500 : 200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-session-refreshed")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(client).not.toHaveBeenCalled();
  }
});

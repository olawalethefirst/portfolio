import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { list, read, getUser, client } = vi.hoisted(() => ({
  list: vi.fn(), read: vi.fn(), getUser: vi.fn(), client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/publications", () => ({ listPublications: list, readPublication: read }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { GET as collection } from "./route";
import { GET as detail } from "./[id]/route";

const id = "11111111-1111-4111-8111-111111111111";
const draft = { title: "Draft", summary: "", bodyMarkdown: "", coverSrc: "", coverAlt: "", tagsText: "", publishedOn: "" };
const record = { id, draft, published: { ...draft, title: "Live" } };
const request = () => new NextRequest("https://portfolio.test/api/admin/publications");
const handlers = [
  () => collection(request()),
  () => detail(request(), { params: Promise.resolve({ id }) }),
];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  list.mockResolvedValue([record]);
  read.mockResolvedValue(record);
});
afterEach(() => vi.unstubAllEnvs());

it("returns the complete ordered collection including separate preview snapshots", async () => {
  const response = await collection(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([record]);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("returns an empty collection without samples", async () => {
  list.mockResolvedValue([]);
  expect(await (await collection(request())).json()).toEqual([]);
});
it("returns the requested saved resource directly", async () => {
  const response = await detail(request(), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(record);
  expect(read).toHaveBeenCalledWith(id);
});
it("rejects malformed IDs before database access", async () => {
  expect((await detail(request(), { params: Promise.resolve({ id: "bad" }) })).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});
it("reports a missing resource", async () => {
  read.mockResolvedValue(null);
  const response = await detail(request(), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
});
it.each(handlers)("denies anonymous access without reading drafts", async (handler) => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await handler()).status).toBe(401);
  expect(list).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});
it.each(handlers)("denies non-owner access without reading drafts", async (handler) => {
  getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  expect((await handler()).status).toBe(403);
  expect(list).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});
it.each(handlers)("fails closed without owner configuration", async (handler) => {
  vi.stubEnv("ADMIN_USER_ID", "");
  expect((await handler()).status).toBe(500);
  expect(list).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});
it.each(handlers)("hides database failures and prevents caching", async (handler) => {
  list.mockRejectedValue(new Error("secret database details"));
  read.mockRejectedValue(new Error("secret database details"));
  const response = await handler();
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

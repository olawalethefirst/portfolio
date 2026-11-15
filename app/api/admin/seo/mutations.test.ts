import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DrizzleQueryError } from "drizzle-orm";

const { insert, read, update, getUser, client } = vi.hoisted(() => ({ insert: vi.fn(), read: vi.fn(), update: vi.fn(), getUser: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/seo", () => ({ insertSeo: insert, readSeo: read, updateSeo: update, listSeo: vi.fn() }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { POST } from "./route";
import { PUT } from "./[id]/route";

const saved = { id: "00000000-0000-4000-8000-000000000002", path: "/contact", title: "Contact", description: "" };
const input = { path: "/%63ontact/", title: "  Contact  ", description: "" };
function request(method: string, body: unknown = input, headers: Record<string, string> = {}) {
  return new NextRequest("https://portfolio.test/api/admin/seo", { method, body: JSON.stringify(body), headers: { origin: "https://portfolio.test", "content-type": "application/json", ...headers } });
}
const context = (id = saved.id) => ({ params: Promise.resolve({ id }) });
const operations = [
  { method: "POST", handle: (req: NextRequest) => POST(req) },
  { method: "PUT", handle: (req: NextRequest) => PUT(req, context()) },
];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  read.mockResolvedValue(saved);
  insert.mockResolvedValue(saved);
  update.mockResolvedValue(saved);
});
afterEach(() => vi.unstubAllEnvs());

it("creates an override with server identity and canonical 201 resource", async () => {
  const response = await POST(request("POST"));
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual(saved);
  expect(insert).toHaveBeenCalledExactlyOnceWith({ ...input, path: "/contact" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("updates by route identity with canonical 200 resource", async () => {
  const response = await PUT(request("PUT"), context());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(saved);
  expect(update).toHaveBeenCalledExactlyOnceWith(saved.id, { ...input, path: "/contact" });
});

it.each(operations)("$method requires owner identity and blocks all DB access", async ({ method, handle }) => {
  for (const [user, status] of [[null, 401], [{ id: "other" }, 403]] as const) {
    getUser.mockResolvedValue({ data: { user }, error: null });
    expect((await handle(request(method))).status).toBe(status);
  }
  expect(read).not.toHaveBeenCalled(); expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
});
it.each(operations)("$method requires valid origin before authentication", async ({ method, handle }) => {
  for (const origin of ["", "null", "https://other.test"]) {
    expect((await handle(request(method, input, { origin }))).status).toBe(403);
  }
  const missing = request(method); missing.headers.delete("origin");
  expect((await handle(missing)).status).toBe(403);
  expect(client).not.toHaveBeenCalled();
});
it.each(operations)("$method requires JSON and accepts charset", async ({ method, handle }) => {
  expect((await handle(request(method, input, { "content-type": "text/plain" }))).status).toBe(400);
  expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  expect((await handle(request(method, input, { "content-type": "Application/JSON; charset=utf-8" }))).status).toBe(method === "POST" ? 201 : 200);
});
it.each(operations)("$method rejects malformed or incomplete bodies before DB access", async ({ method, handle }) => {
  for (const body of [null, [], {}, { title: "Title" }, { ...input, path: 2 }, { ...input, title: null }, { ...input, description: false }, { ...input, id: saved.id }, { ...input, updated_at: "now" }]) {
    const response = await handle(request(method, body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  }
  const malformed = request(method); const headers = new Headers(malformed.headers);
  expect((await handle(new NextRequest(malformed.url, { method, body: "{", headers }))).status).toBe(400);
  expect(read).not.toHaveBeenCalled(); expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
});
it.each(operations)("$method returns 422 request pointers for invalid content", async ({ method, handle }) => {
  const response = await handle(request(method, { path: "/bad?query", title: "", description: " " }));
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR", issues: expect.arrayContaining([
    { pointer: "/path", message: expect.any(String) }, { pointer: "/title", message: expect.any(String) },
  ]) } });
  expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
});
it("rejects default creation and changing an existing default path", async () => {
  expect((await POST(request("POST", { ...input, path: "/" }))).status).toBe(422);
  read.mockResolvedValue({ ...saved, path: "/", description: "Default description" });
  expect((await PUT(request("PUT"), context())).status).toBe(422);
  expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
});
it("validates UUIDs and returns 404 for a missing update target", async () => {
  expect((await PUT(request("PUT"), context("defaults"))).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
  read.mockResolvedValue(null);
  const response = await PUT(request("PUT"), context());
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  expect(update).not.toHaveBeenCalled(); expect(insert).not.toHaveBeenCalled();
});
it.each(operations)("$method returns safe 409 path conflict feedback", async ({ method, handle }) => {
  const failure = new DrizzleQueryError("private SQL", [], Object.assign(new Error("private"), { code: "23505", constraint_name: "seo_path_key" }));
  insert.mockRejectedValue(failure); update.mockRejectedValue(failure);
  const response = await handle(request(method));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: { code: "CONFLICT", issues: [{ pointer: "/path", message: expect.any(String) }] } });
});
it.each(operations)("$method hides unexpected failures and missing configuration", async ({ method, handle }) => {
  insert.mockRejectedValue(new Error("private SQL")); update.mockRejectedValue(new Error("private SQL"));
  const response = await handle(request(method));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later." } });
  vi.stubEnv("ADMIN_USER_ID", "");
  expect((await handle(request(method))).status).toBe(500);
});

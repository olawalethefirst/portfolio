import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { initialHero } from "@/src/cms/hero";
import { CONTENT_LIMITS } from "@/src/config/content-limits";

const { read, update, getUser, client } = vi.hoisted(() => ({
  read: vi.fn(), update: vi.fn(), getUser: vi.fn(), client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/hero", () => ({ readHero: read, updateHero: update }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { GET, PUT } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  read.mockResolvedValue(initialHero);
  update.mockImplementation(async (value) => value);
});
afterEach(() => vi.unstubAllEnvs());

function request(body: unknown = initialHero, headers: Record<string, string> = {}) {
  return new NextRequest("https://portfolio.test/api/admin/hero", {
    method: "PUT", body: JSON.stringify(body),
    headers: { origin: "https://portfolio.test", "content-type": "application/json", ...headers },
  });
}
const getRequest = () => new NextRequest("https://portfolio.test/api/admin/hero");

it("returns saved content directly with private caching", async () => {
  const response = await GET(getRequest());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(initialHero);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it.each([GET, PUT])("denies unauthenticated requests without database access", async (handler) => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await handler(request());
  expect(response.status).toBe(401);
  expect(read).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it("denies a non-owner", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  expect((await PUT(request())).status).toBe(403);
  expect(update).not.toHaveBeenCalled();
});

it("treats missing owner configuration as a server failure", async () => {
  vi.stubEnv("ADMIN_USER_ID", " ");
  expect((await GET(getRequest())).status).toBe(500);
  expect(read).not.toHaveBeenCalled();
});

it("requires same-origin JSON writes", async () => {
  expect((await PUT(request(initialHero, { origin: "https://evil.test" }))).status).toBe(403);
  expect((await PUT(request(initialHero, { "content-type": "text/plain" }))).status).toBe(400);
  expect(update).not.toHaveBeenCalled();
});

it.each([
  null, {}, { ...initialHero, headline: 42 }, { ...initialHero, id: 1 },
  { ...initialHero, stages: { ...initialHero.stages, extra: {} } },
  { ...initialHero, stages: { ...initialHero.stages, idea: { ...initialHero.stages.idea, extra: true } } },
])("rejects invalid structure without writing: %j", async (body) => {
  expect((await PUT(request(body))).status).toBe(400);
  expect(update).not.toHaveBeenCalled();
});

it("rejects malformed JSON", async () => {
  const incoming = new NextRequest(getRequest().url, { method: "PUT", body: "{", headers: {
    origin: "https://portfolio.test", "content-type": "application/json",
  } });
  expect((await PUT(incoming)).status).toBe(400);
  expect(update).not.toHaveBeenCalled();
});

it("returns nested validation issues without saving incomplete content", async () => {
  const body = structuredClone(initialHero);
  body.stages.idea.tagline = " ";
  const response = await PUT(request(body));
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ error: {
    code: "VALIDATION_ERROR", issues: [{ pointer: "/stages/idea/tagline", message: expect.any(String) }],
  } });
  expect(update).not.toHaveBeenCalled();
});

it("returns the canonical saved content", async () => {
  const content = { ...initialHero, headline: "Updated headline" };
  const canonical = { ...content, eyebrow: "Saved by the database" };
  update.mockResolvedValue(canonical);
  const response = await PUT(request(content));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(canonical);
  expect(update).toHaveBeenCalledExactlyOnceWith(content);
});

it("enforces the existing text limits before database writes", async () => {
  const response = await PUT(request({ ...initialHero, headline: "x".repeat(CONTENT_LIMITS.hero.headline + 1) }));
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ error: { issues: [{ pointer: "/headline" }] } });
  expect(update).not.toHaveBeenCalled();
});

it("hides Supabase client configuration failures", async () => {
  client.mockImplementation(() => { throw new Error("private configuration"); });
  const response = await GET(getRequest());
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private configuration");
});

it.each([GET, PUT])("returns 404 for a missing singleton", async (handler) => {
  read.mockResolvedValue(null);
  update.mockResolvedValue(null);
  expect((await handler(request())).status).toBe(404);
});

it("hides database failures", async () => {
  update.mockRejectedValue(new Error("private database credentials"));
  const response = await PUT(request());
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private database credentials");
});

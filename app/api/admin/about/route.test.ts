import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { initialAbout } from "@/src/cms/about";

const { read, update, getUser, client } = vi.hoisted(() => ({
  read: vi.fn(), update: vi.fn(), getUser: vi.fn(), client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/about", () => ({ readAbout: read, updateAbout: update }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { GET, PUT } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  read.mockResolvedValue(initialAbout);
  update.mockImplementation(async (value) => value);
});
afterEach(() => vi.unstubAllEnvs());

function request(body: unknown = initialAbout, headers: Record<string, string> = {}) {
  return new NextRequest("https://portfolio.test/api/admin/about", {
    method: "PUT", body: JSON.stringify(body),
    headers: { origin: "https://portfolio.test", "content-type": "application/json", ...headers },
  });
}
const getRequest = () => new NextRequest("https://portfolio.test/api/admin/about");

it("returns saved About content directly with uncached public content", async () => {
  const response = await GET(getRequest());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(initialAbout);
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it.each([PUT])("denies unauthenticated requests without database access", async (handler) => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await handler(request());
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
  expect(read).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it.each([PUT])("denies a non-owner without database access", async (handler) => {
  getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  expect((await handler(request())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it.each([PUT])("fails closed when owner configuration is missing", async (handler) => {
  vi.stubEnv("ADMIN_USER_ID", " ");
  expect((await handler(request())).status).toBe(500);
  expect(read).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it.each(["https://other.test", "null", ""])("rejects invalid mutation origins before authentication: %s", async (origin) => {
  expect((await PUT(request(initialAbout, { origin }))).status).toBe(403);
  expect(client).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it("rejects a missing Origin", async () => {
  const incoming = request();
  incoming.headers.delete("origin");
  expect((await PUT(incoming)).status).toBe(403);
  expect(update).not.toHaveBeenCalled();
});

it("requires JSON content type and accepts charset parameters", async () => {
  expect((await PUT(request(initialAbout, { "content-type": "text/plain" }))).status).toBe(400);
  expect(update).not.toHaveBeenCalled();
  expect((await PUT(request(initialAbout, { "content-type": "Application/JSON; charset=utf-8" }))).status).toBe(200);
});

it.each([
  null, [], {}, { heading: "Heading" }, { biography: "Biography" },
  { ...initialAbout, heading: 42 }, { ...initialAbout, biography: null },
  { ...initialAbout, id: 1 }, { ...initialAbout, updated_at: "now" },
])("rejects incomplete or unexpected body structure: %j", async (body) => {
  const response = await PUT(request(body));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  expect(update).not.toHaveBeenCalled();
});

it("rejects malformed JSON without writing", async () => {
  const incoming = new NextRequest(getRequest().url, {
    method: "PUT", body: "{",
    headers: { origin: "https://portfolio.test", "content-type": "application/json" },
  });
  expect((await PUT(incoming)).status).toBe(400);
  expect(update).not.toHaveBeenCalled();
});

it("returns field-specific Save validation issues and does not persist blanks", async () => {
  const response = await PUT(request({ heading: " \t", biography: "" }));
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ error: {
    code: "VALIDATION_ERROR",
    issues: [
      { pointer: "/heading", message: expect.any(String) },
      { pointer: "/biography", message: expect.any(String) },
    ],
  } });
  expect(update).not.toHaveBeenCalled();
});

it("preserves submitted strings and returns canonical saved content", async () => {
  const value = { heading: " Heading ", biography: "Paragraph one.\n\nParagraph two.  " };
  const canonical = { ...value, heading: "Canonical heading" };
  update.mockResolvedValue(canonical);
  const response = await PUT(request(value));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(canonical);
  expect(update).toHaveBeenCalledExactlyOnceWith(value);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it.each([GET, PUT])("returns NOT_FOUND for absent required content", async (handler) => {
  read.mockResolvedValue(null);
  update.mockResolvedValue(null);
  const response = await handler(request());
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
});

it.each([GET, PUT])("hides database error details", async (handler) => {
  read.mockRejectedValue(new Error("private database credentials"));
  update.mockRejectedValue(new Error("private database credentials"));
  const response = await handler(request());
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: {
    code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later.",
  } });
});

it("hides authentication setup failures", async () => {
  client.mockImplementation(() => { throw new Error("private configuration"); });
  const response = await PUT(request());
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private configuration");
});


it.each([false, true])("preserves session cookie writes and headers when the operation fails: %s", async (fails) => {
  client.mockImplementation((_cookies: unknown, session: NextResponse) => {
    session.cookies.set("session", "refreshed", { httpOnly: true, path: "/" });
    session.cookies.set("expired-session", "", { maxAge: 0, path: "/" });
    session.headers.set("x-session-refreshed", "true");
    return { auth: { getUser } };
  });
  if (fails) update.mockRejectedValue(new Error("Database unavailable"));
  const response = await PUT(request());
  expect(response.status).toBe(fails ? 500 : 200);
  expect(response.headers.getSetCookie()).toEqual(expect.arrayContaining([
    expect.stringMatching(/^session=refreshed;/),
    expect.stringMatching(/^expired-session=;.*Max-Age=0/),
  ]));
  expect(response.headers.get("x-session-refreshed")).toBe("true");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

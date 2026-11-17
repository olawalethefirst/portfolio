import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { emptyPublication } from "@/src/cms/publications";

const { reorder, list, getUser, client } = vi.hoisted(() => ({
  reorder: vi.fn(),
  list: vi.fn(),
  getUser: vi.fn(),
  client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/publications", () => ({
  reorderPublications: reorder,
  listPublications: list,
}));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { PUT } from "./route";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const draft = emptyPublication();
const ordered = [
  { id: second, draft, published: null },
  { id: first, draft, published: null },
];
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("https://portfolio.test/api/admin/publications/order", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      origin: "https://portfolio.test",
      "content-type": "application/json",
      ...headers,
    },
  });
const order = (body: unknown = { ids: [second, first] }) => PUT(request(body));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  reorder.mockResolvedValue({ status: "saved" });
  list.mockResolvedValue(ordered);
});
afterEach(() => vi.unstubAllEnvs());

it("persists the submitted order and returns the canonical collection", async () => {
  const response = await order();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(ordered);
  expect(reorder).toHaveBeenCalledExactlyOnceWith([second, first]);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("accepts an empty order for an empty collection", async () => {
  list.mockResolvedValue([]);
  const response = await order({ ids: [] });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
  expect(reorder).toHaveBeenCalledExactlyOnceWith([]);
});

it("reports stale membership as a conflict without reading the collection", async () => {
  reorder.mockResolvedValue({ status: "conflict" });
  const response = await order();
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: { code: "CONFLICT" } });
  expect(list).not.toHaveBeenCalled();
});

it("rejects a malformed JSON body before persistence", async () => {
  const response = await PUT(
    new NextRequest("https://portfolio.test/api/admin/publications/order", {
      method: "PUT",
      body: "{",
      headers: {
        origin: "https://portfolio.test",
        "content-type": "application/json",
      },
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: { code: "INVALID_REQUEST" },
  });
  expect(reorder).not.toHaveBeenCalled();
});

it.each([
  ["a non-array order", { ids: "all" }],
  ["malformed IDs", { ids: [first, "bad"] }],
  ["unknown keys", { ids: [first], mode: "swap" }],
  ["a missing order", {}],
])("rejects %s before persistence", async (_label, body) => {
  const response = await order(body);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: { code: "INVALID_REQUEST" },
  });
  expect(reorder).not.toHaveBeenCalled();
});

it("rejects cross-origin submissions before persistence", async () => {
  const response = await PUT(
    request({ ids: [second, first] }, { origin: "https://attacker.test" }),
  );
  expect(response.status).toBe(403);
  expect(reorder).not.toHaveBeenCalled();
});

it("rejects an unsupported content type before persistence", async () => {
  const response = await PUT(
    request({ ids: [second, first] }, { "content-type": "text/plain" }),
  );
  expect(response.status).toBe(400);
  expect(reorder).not.toHaveBeenCalled();
});

it("denies anonymous access without persistence", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await order()).status).toBe(401);
  expect(reorder).not.toHaveBeenCalled();
});

it("denies non-owner access without persistence", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
  expect((await order()).status).toBe(403);
  expect(reorder).not.toHaveBeenCalled();
});

it("fails closed without owner configuration", async () => {
  vi.stubEnv("ADMIN_USER_ID", "");
  expect((await order()).status).toBe(500);
  expect(reorder).not.toHaveBeenCalled();
});

it("hides persistence failures and prevents caching", async () => {
  reorder.mockRejectedValue(new Error("secret database details"));
  const response = await order();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unable to complete this request. Try again later.",
    },
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

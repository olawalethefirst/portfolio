import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { post, read, client } = vi.hoisted(() => ({
  post: vi.fn(),
  read: vi.fn(),
  client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
vi.mock("@/src/cms/publication-comment-service", () => ({
  postPublicationComment: post,
  readPublicationThreads: read,
}));

import { GET, POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const threads = [
  { id: "t1", name: "Ada", date: "2026-01-01T00:00:00.000Z", text: "Hi", replies: [] },
];
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
const url = `https://portfolio.test/api/publications/${id}/comments`;
const body = { parentId: null, name: "Ada", bodyMarkdown: "Hi" };
const postRequest = (
  value: unknown = body,
  headers: Record<string, string> = {
    origin: "https://portfolio.test",
    "content-type": "application/json",
  },
) =>
  new NextRequest(url, {
    method: "POST",
    headers,
    body: typeof value === "string" ? value : JSON.stringify(value),
  });

beforeEach(() => {
  vi.resetAllMocks();
  client.mockImplementation(() => {
    throw new Error("Auth should not be called");
  });
  read.mockResolvedValue({ ok: true, threads });
  post.mockResolvedValue({ ok: true, threads });
});

it("reads threads anonymously with no-store caching", async () => {
  const response = await GET(new NextRequest(url), params());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ threads });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(read).toHaveBeenCalledExactlyOnceWith(id);
});

it("returns 404 for comments of an unpublished publication", async () => {
  read.mockResolvedValue({ ok: false, error: { code: "NOT_FOUND", message: "Publication was not found." } });
  expect((await GET(new NextRequest(url), params())).status).toBe(404);
});

it("rejects malformed IDs before service calls", async () => {
  expect((await GET(new NextRequest(url), params("bad"))).status).toBe(400);
  expect((await POST(postRequest(), params("bad"))).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});

it("posts anonymously and returns refreshed threads with 201", async () => {
  const response = await POST(postRequest(), params());
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ threads });
  expect(post).toHaveBeenCalledExactlyOnceWith(id, body);
});

it("passes a missing parentId through for the service to default", async () => {
  await POST(postRequest({ name: "Ada", bodyMarkdown: "Hi" }), params());
  expect(post).toHaveBeenCalledExactlyOnceWith(id, { name: "Ada", bodyMarkdown: "Hi" });
});

it.each([
  ["cross-origin", { origin: "https://evil.test", "content-type": "application/json" }],
  ["missing origin", { "content-type": "application/json" }],
])("rejects %s posts with 403 before the service", async (_n, headers) => {
  expect((await POST(postRequest(body, headers), params())).status).toBe(403);
  expect(post).not.toHaveBeenCalled();
});

it("rejects a non-JSON content type with 400", async () => {
  const response = await POST(
    postRequest("x", { origin: "https://portfolio.test", "content-type": "text/plain" }),
    params(),
  );
  expect(response.status).toBe(400);
  expect(post).not.toHaveBeenCalled();
});

it.each([
  ["invalid JSON", "{nope"],
  ["unknown keys", { ...body, extra: 1 }],
  ["wrong types", { name: 1, bodyMarkdown: "Hi" }],
])("rejects %s with 400 before the service", async (_n, value) => {
  expect((await POST(postRequest(value), params())).status).toBe(400);
  expect(post).not.toHaveBeenCalled();
});

it("maps service validation failures to 422 with field issues", async () => {
  post.mockResolvedValue({
    ok: false,
    error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", issues: [{ pointer: "/name", message: "Enter your name." }] },
  });
  const response = await POST(postRequest(), params());
  expect(response.status).toBe(422);
  expect((await response.json()).error.issues[0].pointer).toBe("/name");
});

it("returns a generic 500 when the service throws", async () => {
  post.mockRejectedValue(new Error("db password leaked"));
  const response = await POST(postRequest(), params());
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain("leaked");
});

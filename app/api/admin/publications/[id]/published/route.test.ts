import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { publish, unpublish, getUser, client } = vi.hoisted(() => ({
  publish: vi.fn(),
  unpublish: vi.fn(),
  getUser: vi.fn(),
  client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
vi.mock("@/src/cms/publication-service", () => ({
  publishPublication: publish,
  unpublishPublication: unpublish,
}));

import { DELETE, PUT } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const content = {
  title: "Launch notes",
  summary: "Summary",
  bodyMarkdown: "Body",
  coverSrc: "/media/22222222-2222-4222-8222-222222222222",
  coverAlt: "Cover",
  tagsText: "alpha, beta",
  publishedOn: "2026-01-01",
};
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = (method: string, body?: unknown) =>
  new NextRequest(
    `https://portfolio.test/api/admin/publications/${id}/published`,
    {
      method,
      headers: {
        origin: "https://portfolio.test",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  publish.mockResolvedValue({
    ok: true,
    content: { id, draft: content, published: content },
  });
  unpublish.mockResolvedValue({ ok: true, content });
});
afterEach(() => vi.unstubAllEnvs());

it("publishes the submitted snapshot through the service", async () => {
  const response = await PUT(request("PUT", { draft: content }), params());
  expect(response.status).toBe(200);
  expect(publish).toHaveBeenCalledExactlyOnceWith(id, content);
});

it("rejects malformed IDs before service calls", async () => {
  expect(
    (await PUT(request("PUT", { draft: content }), params("bad"))).status,
  ).toBe(400);
  expect(publish).not.toHaveBeenCalled();
});

it("returns not found when the publication does not exist", async () => {
  publish.mockResolvedValue({
    ok: false,
    error: { code: "NOT_FOUND", message: "Publication was not found." },
  });
  expect((await PUT(request("PUT", { draft: content }), params())).status).toBe(
    404,
  );
});

it("reports validation errors from the service", async () => {
  publish.mockResolvedValue({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      issues: [
        { pointer: "/title", message: "Add a title before publishing." },
      ],
    },
  });
  const response = await PUT(request("PUT", { draft: content }), params());
  expect(response.status).toBe(422);
});

it("denies anonymous publish without calling the service", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await PUT(request("PUT", { draft: content }), params())).status).toBe(
    401,
  );
  expect(publish).not.toHaveBeenCalled();
});

it("deletes only the published snapshot through the service", async () => {
  const response = await DELETE(request("DELETE"), params());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(content);
  expect(unpublish).toHaveBeenCalledExactlyOnceWith(id);
});

it("rejects malformed IDs before unpublish service calls", async () => {
  expect((await DELETE(request("DELETE"), params("bad"))).status).toBe(400);
  expect(unpublish).not.toHaveBeenCalled();
});

it("returns not found when no published snapshot exists", async () => {
  unpublish.mockResolvedValue({
    ok: false,
    error: { code: "NOT_FOUND", message: "Published Publication was not found." },
  });
  expect((await DELETE(request("DELETE"), params())).status).toBe(404);
});

it("denies anonymous unpublish without calling the service", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await DELETE(request("DELETE"), params())).status).toBe(401);
  expect(unpublish).not.toHaveBeenCalled();
});

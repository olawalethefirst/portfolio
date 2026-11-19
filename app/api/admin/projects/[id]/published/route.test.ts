import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { publish, unpublish, getUser, client } = vi.hoisted(() => ({
  publish: vi.fn(), unpublish: vi.fn(), getUser: vi.fn(), client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
vi.mock("@/src/cms/project-service", () => ({ publishProject: publish, unpublishProject: unpublish }));

import { DELETE, PUT } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const content = {
  name: "Studio", summary: "Summary", what: "What", how: "How", platform: "web", tagsText: "Tools",
  screenshot: "/media/22222222-2222-4222-8222-222222222222", screenshotAlt: "Interface",
  liveUrl: "https://example.com",
};
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = (method: string, body?: unknown) => new NextRequest(
  `https://portfolio.test/api/admin/projects/${id}/published`,
  { method, headers: { origin: "https://portfolio.test", ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined },
);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  publish.mockResolvedValue({ ok: true, content: { id, draft: content, published: content } });
  unpublish.mockResolvedValue({ ok: true, content });
});
afterEach(() => vi.unstubAllEnvs());

it("publishes the submitted snapshot through the service", async () => {
  const response = await PUT(request("PUT", { draft: content }), params());
  expect(response.status).toBe(200);
  expect(publish).toHaveBeenCalledExactlyOnceWith(id, content);
});

it("deletes only the published snapshot through the service", async () => {
  const response = await DELETE(request("DELETE"), params());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(content);
  expect(unpublish).toHaveBeenCalledExactlyOnceWith(id);
});

it("rejects malformed IDs before service calls", async () => {
  expect((await DELETE(request("DELETE"), params("bad"))).status).toBe(400);
  expect(unpublish).not.toHaveBeenCalled();
});

it("returns not found when no published snapshot exists", async () => {
  unpublish.mockResolvedValue({ ok: false, error: { code: "NOT_FOUND", message: "Published Project was not found." } });
  expect((await DELETE(request("DELETE"), params())).status).toBe(404);
});

it("denies anonymous unpublish without calling the service", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await DELETE(request("DELETE"), params())).status).toBe(401);
  expect(unpublish).not.toHaveBeenCalled();
});

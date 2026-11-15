import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const { remove, getUser, client } = vi.hoisted(() => ({
  remove: vi.fn(),
  getUser: vi.fn(),
  client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/projects", () => ({ deleteProject: remove }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));

import { DELETE } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const params = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = (origin: string | null = "https://portfolio.test") =>
  new NextRequest(`https://portfolio.test/api/admin/projects/${id}`, {
    method: "DELETE",
    headers: origin === null ? {} : { origin },
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  remove.mockResolvedValue(id);
});
afterEach(() => vi.unstubAllEnvs());

it("deletes the requested Project without requiring a body or content type", async () => {
  const response = await DELETE(request(), params());
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(response.headers.get("content-type")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(remove).toHaveBeenCalledExactlyOnceWith(id);
});

it.each([null, "null", "https://other.test"])(
  "rejects origin %s before authentication or deletion",
  async (origin) => {
    const response = await DELETE(request(origin), params());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(client).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  },
);

it.each([
  [null, 401, "UNAUTHENTICATED"],
  [{ id: "other" }, 403, "FORBIDDEN"],
])("denies unauthorized deletion for %s", async (user, status, code) => {
  getUser.mockResolvedValue({ data: { user }, error: null });
  const response = await DELETE(request(), params());
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({ error: { code } });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(remove).not.toHaveBeenCalled();
});

it("fails closed when owner configuration is missing", async () => {
  vi.stubEnv("ADMIN_USER_ID", "");
  const response = await DELETE(request(), params());
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
  expect(remove).not.toHaveBeenCalled();
});

it("rejects malformed IDs without deleting content", async () => {
  const response = await DELETE(request(), params("bad"));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  expect(remove).not.toHaveBeenCalled();
});

it("returns not found when the Project is absent", async () => {
  remove.mockResolvedValue(null);
  const response = await DELETE(request(), params());
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("hides database failures instead of reporting successful deletion", async () => {
  remove.mockRejectedValue(new Error("secret database details"));
  const response = await DELETE(request(), params());
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unable to complete this request. Try again later.",
    },
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it.each(["success", "failure"])(
  "preserves session writes on deletion %s",
  async (outcome) => {
    client.mockImplementation((_cookies: unknown, session: NextResponse) => {
      session.cookies.set("refreshed-session", "test-value", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return { auth: { getUser } };
    });
    if (outcome === "failure") remove.mockRejectedValue(new Error("Database unavailable"));
    const response = await DELETE(request(), params());
    expect(response.status).toBe(outcome === "success" ? 204 : 500);
    expect(response.headers.get("set-cookie")).toContain("refreshed-session=test-value");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    if (outcome === "success") expect(await response.text()).toBe("");
  },
);

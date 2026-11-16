import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { emptyPublication } from "@/src/cms/publications";

const { insert, update, getUser, client } = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  getUser: vi.fn(),
  client: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/publications", () => ({
  insertPublication: insert,
  updatePublication: update,
}));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { POST } from "./route";
import { PUT } from "./[id]/route";

const id = "11111111-1111-4111-8111-111111111111";
const draft = emptyPublication();
const record = { id, draft, published: null };
const request = (method: string, body: unknown) =>
  new NextRequest("https://portfolio.test/api/admin/publications", {
    method,
    body: JSON.stringify(body),
    headers: {
      origin: "https://portfolio.test",
      "content-type": "application/json",
    },
  });
const operations = [
  {
    name: "create",
    status: 201,
    write: insert,
    run: (value: unknown) =>
      POST(request("POST", { intent: "save", draft: value })),
  },
  {
    name: "save",
    status: 200,
    write: update,
    run: (value: unknown) =>
      PUT(request("PUT", { draft: value }), {
        params: Promise.resolve({ id }),
      }),
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", "owner");
  getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  client.mockReturnValue({ auth: { getUser } });
  insert.mockResolvedValue(record);
  update.mockResolvedValue(record);
});
afterEach(() => vi.unstubAllEnvs());

it.each(operations)(
  "$name persists incomplete content and returns the canonical record",
  async ({ run, status, write, name }) => {
    const response = await run(draft);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(record);
    expect(write).toHaveBeenCalledExactlyOnceWith(
      ...(name === "create" ? [draft] : [id, draft]),
    );
  },
);

it.each(operations)(
  "$name rejects a structurally invalid draft before persistence",
  async ({ run }) => {
    const response = await run({ ...draft, title: 42 });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  },
);

it.each(operations)(
  "$name hides persistence failures",
  async ({ run, write }) => {
    write.mockRejectedValue(new Error("secret database details"));
    const response = await run(draft);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to complete this request. Try again later.",
      },
    });
  },
);

it("returns not found when saving an absent Publication", async () => {
  update.mockResolvedValue(null);
  const response = await operations[1].run(draft);
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
});

it("rejects an unsupported POST intent before persistence", async () => {
  const response = await POST(request("POST", { intent: "publish", draft }));
  expect(response.status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});

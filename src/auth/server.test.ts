import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CookieMethodsServer } from "@supabase/ssr";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn<
    (
      url: string,
      key: string,
      options: { cookies: CookieMethodsServer },
    ) => object
  >(() => ({})),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
});
afterEach(() => vi.unstubAllEnvs());

function request(value = "request-one") {
  return { getAll: vi.fn(() => [{ name: "session", value }]) };
}
function response() {
  return { cookies: { set: vi.fn() }, headers: { set: vi.fn() } };
}
function adapter(): CookieMethodsServer {
  return createServerClient.mock.calls.at(-1)![2].cookies;
}

it("loads without configuration and fails safely before constructing an unconfigured client", async () => {
  vi.stubEnv("SUPABASE_URL", undefined);
  const { createSupabaseServerClient } = await import("./server");
  expect(() => createSupabaseServerClient(request(), response())).toThrow(
    "SUPABASE_URL is not configured.",
  );
  expect(createServerClient).not.toHaveBeenCalled();
});

it.each([undefined, "", "   "])(
  "rejects a missing/blank publishable key: %s",
  async (value) => {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", value);
    const { createSupabaseServerClient } = await import("./server");
    expect(() => createSupabaseServerClient(request(), response())).toThrow(
      "SUPABASE_PUBLISHABLE_KEY is not configured.",
    );
    expect(createServerClient).not.toHaveBeenCalled();
  },
);

it("isolates request cookies and creates a fresh client for every call using the publishable key", async () => {
  const { createSupabaseServerClient } = await import("./server");
  const first = createSupabaseServerClient(request("first"), response());
  const firstAdapter = adapter();
  const second = createSupabaseServerClient(request("second"), response());
  expect(second).not.toBe(first);
  expect(await firstAdapter.getAll()).toEqual([
    { name: "session", value: "first" },
  ]);
  expect(await adapter().getAll()).toEqual([
    { name: "session", value: "second" },
  ]);
  expect(createServerClient).toHaveBeenLastCalledWith(
    "https://example.supabase.co",
    "publishable-test-key",
    expect.any(Object),
  );
});

it("forwards every cookie chunk, deletion options and required cache headers to the response", async () => {
  const { createSupabaseServerClient } = await import("./server");
  const outgoing = response();
  createSupabaseServerClient(request(), outgoing);
  await adapter().setAll!(
    [
      {
        name: "session.0",
        value: "chunk",
        options: { path: "/", secure: true, sameSite: "lax" },
      },
      { name: "session.1", value: "", options: { path: "/", maxAge: 0 } },
    ],
    { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" },
  );
  expect(outgoing.cookies.set.mock.calls).toEqual([
    ["session.0", "chunk", { path: "/", secure: true, sameSite: "lax" }],
    ["session.1", "", { path: "/", maxAge: 0 }],
  ]);
  expect(outgoing.headers.set.mock.calls).toEqual([
    ["Cache-Control", "private, no-store"],
    ["Expires", "0"],
    ["Pragma", "no-cache"],
  ]);
});

it("does not hide response write failures", async () => {
  const { createSupabaseServerClient } = await import("./server");
  const outgoing = response();
  outgoing.cookies.set.mockImplementation(() => {
    throw new Error("Response committed");
  });
  createSupabaseServerClient(request(), outgoing);
  expect(() =>
    adapter().setAll!([{ name: "session", value: "new", options: {} }], {}),
  ).toThrow("Response committed");
});

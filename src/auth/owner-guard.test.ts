import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  AuthApiError,
  AuthSessionMissingError,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
import { authorizeAdmin } from "./owner-guard";

const user: User = {
  id: "11111111-1111-4111-8111-111111111111",
  app_metadata: { provider: "github" },
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-11-13T00:00:00Z",
};

beforeEach(() => vi.stubEnv("ADMIN_USER_ID", user.id));
afterEach(() => vi.unstubAllEnvs());

function provider() {
  return { getUser: vi.fn<SupabaseClient["auth"]["getUser"]>() };
}

it("authorizes only the owner verified by Supabase", async () => {
  const auth = provider();
  auth.getUser.mockResolvedValue({ data: { user }, error: null });
  expect(await authorizeAdmin(auth)).toEqual({ ok: true, userId: user.id });
  expect(auth.getUser).toHaveBeenCalledExactlyOnceWith();
});

it.each([undefined, "", "   "])(
  "denies access with missing/blank owner configuration: %j",
  async (id) => {
    vi.stubEnv("ADMIN_USER_ID", id);
    const auth = provider();
    expect(await authorizeAdmin(auth)).toEqual({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "This account doesn’t have admin access.",
      },
    });
    expect(auth.getUser).not.toHaveBeenCalled();
  },
);

it("denies a verified non-owner even if their metadata claims ownership", async () => {
  const auth = provider();
  auth.getUser.mockResolvedValue({
    data: {
      user: {
        ...user,
        id: "22222222-2222-4222-8222-222222222222",
        user_metadata: { role: "admin", ownerId: user.id },
      },
    },
    error: null,
  });
  expect(await authorizeAdmin(auth)).toEqual({
    ok: false,
    error: {
      code: "FORBIDDEN",
      message: "This account doesn’t have admin access.",
    },
  });
});

it.each([
  new AuthSessionMissingError(),
  new AuthApiError("private provider details", 401, "bad_jwt"),
])(
  "denies a missing or unverifiable session without exposing provider details",
  async (error) => {
    const auth = provider();
    auth.getUser.mockResolvedValue({ data: { user: null }, error });
    expect(await authorizeAdmin(auth)).toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Sign in to continue." },
    });
  },
);

it("denies access when verification throws", async () => {
  const auth = provider();
  auth.getUser.mockRejectedValue(new Error("private provider details"));
  expect(await authorizeAdmin(auth)).toEqual({
    ok: false,
    error: { code: "UNAUTHENTICATED", message: "Sign in to continue." },
  });
});

it("reads owner configuration on each call rather than retaining prior authorization", async () => {
  const auth = provider();
  auth.getUser.mockResolvedValue({ data: { user }, error: null });
  expect((await authorizeAdmin(auth)).ok).toBe(true);
  vi.stubEnv("ADMIN_USER_ID", "22222222-2222-4222-8222-222222222222");
  expect(await authorizeAdmin(auth)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
});

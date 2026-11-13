import { expect, it, vi } from "vitest";
import {
  AuthApiError,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { completeGitHubSignIn } from "./callback-service";

const user: User = {
  id: "11111111-1111-4111-8111-111111111111",
  app_metadata: { provider: "github" },
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-11-13T00:00:00Z",
};
const session: Session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user,
};
const failure = {
  ok: false,
  error: {
    code: "UNAUTHENTICATED",
    message: "Sign-in could not complete. Try again.",
  },
};

function provider() {
  return {
    exchangeCodeForSession:
      vi.fn<SupabaseClient["auth"]["exchangeCodeForSession"]>(),
  };
}

it("exchanges the code once, unchanged, and returns only the authenticated user ID", async () => {
  const auth = provider();
  auth.exchangeCodeForSession.mockResolvedValue({
    data: { session, user },
    error: null,
  });

  expect(await completeGitHubSignIn(auth, " opaque-code ")).toEqual({
    ok: true,
    userId: user.id,
  });
  expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith(
    " opaque-code ",
  );
});

it.each(["", " ", "\t\n"])(
  "rejects blank code %j without contacting the provider",
  async (code) => {
    const auth = provider();

    expect(await completeGitHubSignIn(auth, code)).toEqual({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "A sign-in code is required.",
      },
    });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  },
);

it("returns a safe failure for a rejected exchange without retrying", async () => {
  const auth = provider();
  auth.exchangeCodeForSession.mockResolvedValue({
    data: { session: null, user: null },
    error: new AuthApiError("private provider details", 400, "invalid_grant"),
  });

  expect(await completeGitHubSignIn(auth, "test-code")).toEqual(failure);
  expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
});

it("returns a safe failure for a thrown exchange without retrying", async () => {
  const auth = provider();
  auth.exchangeCodeForSession.mockRejectedValue(
    new Error("private provider details"),
  );

  expect(await completeGitHubSignIn(auth, "test-code")).toEqual(failure);
  expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
});

it.each(["", " "])("rejects a blank user ID %j after exchange", async (id) => {
  const auth = provider();
  const exchangedUser: User = { ...user, id };
  auth.exchangeCodeForSession.mockResolvedValue({
    data: {
      session: { ...session, user: exchangedUser },
      user: exchangedUser,
    },
    error: null,
  });

  expect(await completeGitHubSignIn(auth, "test-code")).toEqual(failure);
});

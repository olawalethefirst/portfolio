import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiError } from "@/src/api/errors";

type GitHubCallbackResult =
  | { ok: true; userId: string }
  | { ok: false; error: ApiError };

/** Exchange identity only; the admin guard separately decides access. */
export async function completeGitHubSignIn(
  auth: Pick<SupabaseClient["auth"], "exchangeCodeForSession">,
  code: string,
): Promise<GitHubCallbackResult> {
  if (!code.trim()) {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "A sign-in code is required.",
      },
    };
  }

  const failure: GitHubCallbackResult = {
    ok: false,
    error: {
      code: "UNAUTHENTICATED",
      message: "Sign-in could not complete. Try again.",
    },
  };
  try {
    // https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
    const { data, error } = await auth.exchangeCodeForSession(code);
    const userId = data?.user?.id;
    return error ||
      !data?.session ||
      typeof userId !== "string" ||
      !userId.trim()
      ? failure
      : { ok: true, userId };
  } catch {
    return failure;
  }
}

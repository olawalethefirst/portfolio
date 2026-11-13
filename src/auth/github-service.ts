import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiError } from "@/src/api/errors";
import { adminReturnPath } from "./return-path";

type GitHubSignInResult = { ok: true; url: string } | { ok: false; error: ApiError };

export async function startGitHubSignIn(
  auth: Pick<SupabaseClient["auth"], "signInWithOAuth">,
  origin: string,
  returnTo?: string | null,
): Promise<GitHubSignInResult> {
  const callback = new URL("/api/auth/callback", origin);
  callback.searchParams.set("returnTo", adminReturnPath(returnTo));
  const failure: GitHubSignInResult = {
    ok: false,
    error: { code: "SERVICE_UNAVAILABLE", message: "Sign-in could not start. Try again." },
  };
  try {
    const { data, error } = await auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: callback.toString(),
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    return error || !data.url ? failure : { ok: true, url: data.url };
  } catch {
    return failure;
  }
}

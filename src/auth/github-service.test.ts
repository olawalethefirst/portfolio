import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { startGitHubSignIn } from "./github-service";

function provider() {
  return { signInWithOAuth: vi.fn<SupabaseClient["auth"]["signInWithOAuth"]>() };
}

it("returns the authorization destination with the validated callback input", async () => {
  const auth = provider();
  auth.signInWithOAuth.mockResolvedValue({ data: { provider: "github", url: "https://example.supabase.co/auth/v1/authorize" }, error: null });
  expect(await startGitHubSignIn(auth, "https://portfolio.test", "/admin/projects?platform=web"))
    .toEqual({ ok: true, url: "https://example.supabase.co/auth/v1/authorize" });
  expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "github", options: {
    redirectTo: "https://portfolio.test/api/auth/callback?returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb", skipBrowserRedirect: true,
  } });
});

it.each([undefined, "/admin/login", "https://evil.test"])("uses the accepted fallback for return input: %s", async (returnTo) => {
  const auth = provider();
  auth.signInWithOAuth.mockResolvedValue({ data: { provider: "github", url: "https://example.supabase.co/auth/v1/authorize" }, error: null });
  await startGitHubSignIn(auth, "https://portfolio.test", returnTo);
  const callback = new URL(auth.signInWithOAuth.mock.calls[0][0].options!.redirectTo!);
  expect(callback.searchParams.get("returnTo")).toBe("/admin");
});

it("returns a safe application error when the provider throws", async () => {
  const auth = provider();
  auth.signInWithOAuth.mockRejectedValue(new Error("private details"));
  expect(await startGitHubSignIn(auth, "https://portfolio.test", "/admin"))
    .toEqual({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Sign-in could not start. Try again." } });
});

it("returns a safe application error when no authorization URL is supplied", async () => {
  const auth = provider();
  auth.signInWithOAuth.mockResolvedValue({ data: { provider: "github", url: "" }, error: null });
  expect(await startGitHubSignIn(auth, "https://portfolio.test")).toMatchObject({ ok: false, error: { code: "SERVICE_UNAVAILABLE" } });
});

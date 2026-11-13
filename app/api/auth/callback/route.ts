import { NextRequest, NextResponse } from "next/server";
import { completeGitHubSignIn } from "@/src/auth/callback-service";
import { adminReturnPath } from "@/src/auth/return-path";
import { createSupabaseServerClient } from "@/src/auth/server";
import { adminLoginRedirect } from "@/src/auth/admin-navigation";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const returnTo = adminReturnPath(
    params.getAll("returnTo").length > 1 ? null : params.get("returnTo"),
  );
  const failure = new URL("/admin/login", request.nextUrl.origin);
  failure.searchParams.set("error", "sign_in_failed");
  failure.searchParams.set("returnTo", returnTo);
  const response = NextResponse.redirect(failure, 303);
  response.headers.set("Cache-Control", "no-store");
  const code = params.get("code");
  if (
    !code?.trim() ||
    params.getAll("code").length !== 1 ||
    params.getAll("returnTo").length > 1 ||
    params.has("error") ||
    params.has("error_code")
  ) {
    return response;
  }

  let supabase: ReturnType<typeof createSupabaseServerClient>;
  try {
    supabase = createSupabaseServerClient(request.cookies, response);
  } catch {
    return response;
  }
  const result = await completeGitHubSignIn(supabase.auth, code);
  if (result.ok) {
    const denied = await adminLoginRedirect(supabase.auth, returnTo, "sign_in_failed");
    response.headers.set(
      "Location",
      new URL(denied ?? returnTo, request.nextUrl.origin).toString(),
    );
  }
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/auth/server";
import { apiErrorResponse, type ApiError } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { startGitHubSignIn } from "@/src/auth/github-service";
import { adminReturnPath } from "@/src/auth/return-path";

function signInFailure(request: NextRequest, error: ApiError, returnTo: string | null) {
  if (!request.headers.get("accept")?.includes("text/html")) return apiErrorResponse(error);
  const destination = new URL("/admin/login", request.nextUrl.origin);
  destination.searchParams.set("error", "sign_in_failed");
  destination.searchParams.set("returnTo", adminReturnPath(returnTo));
  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const POST = withSameOrigin(withContentType(
  "application/x-www-form-urlencoded",
  async (request: NextRequest) => {
    let returnTo: string | null;
    try {
      const form = await request.formData();
      if (
        [...form.keys()].some((key) => key !== "returnTo") ||
        form.getAll("returnTo").length > 1
      ) {
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Invalid sign-in input.",
        });
      }
      const value = form.get("returnTo");
      if (value !== null && typeof value !== "string") {
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Invalid return destination.",
        });
      }
      returnTo = value;
    } catch {
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Invalid sign-in input.",
      });
    }

    const response = new NextResponse(null, {
      status: 303,
      headers: { "Cache-Control": "private, no-store" },
    });
    let supabase: ReturnType<typeof createSupabaseServerClient>;
    try {
      supabase = createSupabaseServerClient(request.cookies, response);
    } catch {
      return signInFailure(request, {
        code: "INTERNAL_ERROR",
        message: "Sign-in is not configured. Try again later.",
      }, returnTo);
    }
    const result = await startGitHubSignIn(
      supabase.auth,
      request.nextUrl.origin,
      returnTo,
    );
    if (!result.ok) return signInFailure(request, result.error, returnTo);
    response.headers.set("Location", result.url);
    return response;
  },
  "Submit the sign-in form.",
));

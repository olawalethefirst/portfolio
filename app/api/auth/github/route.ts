import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/auth/server";
import { apiErrorResponse } from "@/src/api/errors";
import { checkSameOrigin, hasContentType } from "@/src/api/request";
import { startGitHubSignIn } from "@/src/auth/github-service";

export async function POST(request: NextRequest) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;
  if (!hasContentType(request, "application/x-www-form-urlencoded")) {
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Submit the sign-in form.",
    });
  }

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
    return apiErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Sign-in is not configured. Try again later.",
    });
  }
  const result = await startGitHubSignIn(
    supabase.auth,
    request.nextUrl.origin,
    returnTo,
  );
  if (!result.ok) return apiErrorResponse(result.error);
  response.headers.set("Location", result.url);
  return response;
}

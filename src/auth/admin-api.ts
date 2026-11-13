import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { authorizeAdmin } from "./owner-guard";
import { createSupabaseServerClient } from "./server";
import { applySessionResponse } from "./session-response";
import type { RequestHandler } from "@/src/api/request";

/** Authenticate JSON API operations and retain session writes on every outcome. */
export function withAdminApi<TRequest extends NextRequest, TContext extends unknown[]>(
  operation: RequestHandler<TRequest, TContext>,
) {
  return async (request: TRequest, ...context: TContext) => {
    const session = new NextResponse(null);
    let result: Response;
    try {
      if (!process.env.ADMIN_USER_ID?.trim())
        throw new Error("Owner is not configured.");
      const supabase = createSupabaseServerClient(request.cookies, session);
      const authorization = await authorizeAdmin(supabase.auth);
      result = authorization.ok
        ? await operation(request, ...context)
        : apiErrorResponse(authorization.error);
    } catch {
      result = apiErrorResponse({
        code: "INTERNAL_ERROR",
        message: "Unable to complete this request. Try again later.",
      });
    }
    const response = new NextResponse(result.body, {
      status: result.status,
      headers: result.headers,
    });
    applySessionResponse(session, response);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
}

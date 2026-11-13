import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/auth/server";
import { adminLoginRedirect } from "@/src/auth/admin-navigation";
import { applySessionResponse } from "@/src/auth/session-response";

export async function proxy(request: NextRequest) {
  const session = new NextResponse(null, { headers: { "Cache-Control": "no-store" } });
  const supabase = createSupabaseServerClient(request.cookies, {
    headers: session.headers,
    cookies: {
      set(name, value, options) {
        request.cookies.set(name, value);
        session.cookies.set(name, value, options);
      },
    },
  });

  // Refresh first so owner verification uses the updated session.
  await supabase.auth.getClaims();

  const path = request.nextUrl.pathname;
  const isStudio = (path === "/admin" || path.startsWith("/admin/")) &&
    path !== "/admin/login" && !path.startsWith("/admin/login/");
  const denied = isStudio
    ? await adminLoginRedirect(supabase.auth, path + request.nextUrl.search)
    : null;

  // Build after refresh so downstream rendering receives the updated Cookie header.
  const response = denied
    ? NextResponse.redirect(new URL(denied, request.nextUrl.origin), 303)
    : NextResponse.next({ request });
  return applySessionResponse(session, response);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

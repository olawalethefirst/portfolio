import { NextRequest, NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { createSupabaseServerClient } from "@/src/auth/server";
import { adminLoginRedirect } from "@/src/auth/admin-navigation";

export async function proxy(request: NextRequest) {
  const updates: { name: string; value: string; options: CookieOptions }[] = [];
  const headers = new Headers({ "Cache-Control": "no-store" });
  const supabase = createSupabaseServerClient(request.cookies, {
    headers,
    cookies: {
      set(name, value, options) {
        request.cookies.set(name, value);
        updates.push({ name, value, options });
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
  headers.forEach((value, key) => response.headers.set(key, value));
  for (const { name, value, options } of updates) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

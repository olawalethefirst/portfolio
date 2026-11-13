import { NextRequest, NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { createSupabaseServerClient } from "@/src/auth/server";

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

  // getClaims refreshes expiring sessions; owner authorization remains separate.
  await supabase.auth.getClaims();

  // Build after refresh so downstream rendering receives the updated Cookie header.
  const response = NextResponse.next({ request, headers });
  for (const { name, value, options } of updates) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

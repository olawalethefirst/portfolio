import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type RequestCookies = { getAll(): { name: string; value: string }[] };
type AuthResponse = {
  cookies: { set(name: string, value: string, options: CookieOptions): unknown };
  headers: { set(name: string, value: string): unknown };
};

/** Create once per request, with the response that will actually be returned. */
export function createSupabaseServerClient(requestCookies: RequestCookies, response: AuthResponse) {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url) throw new Error("SUPABASE_URL is not configured.");
  if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured.");

  return createServerClient(url, key, {
    cookies: {
      getAll: () => requestCookies.getAll(),
      setAll(cookies, headers) {
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
        for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
      },
    },
  });
}

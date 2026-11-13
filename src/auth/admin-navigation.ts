import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "./owner-guard";
import { adminReturnPath } from "./return-path";

/** Compose owner verification with login navigation; callers own the response. */
export async function adminLoginRedirect(
  auth: Pick<SupabaseClient["auth"], "getUser">,
  returnTo: string,
  unauthenticatedError?: "sign_in_failed",
): Promise<string | null> {
  const result = await authorizeAdmin(auth);
  if (result.ok) return null;

  const query = new URLSearchParams({ returnTo: adminReturnPath(returnTo) });
  const error = result.error.code === "FORBIDDEN" ? "access_denied" : unauthenticatedError;
  if (error) query.set("error", error);
  return `/admin/login?${query}`;
}

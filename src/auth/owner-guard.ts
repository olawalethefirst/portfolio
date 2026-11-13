import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiError } from "@/src/api/errors";

type OwnerAuthorization =
  | { ok: true; userId: string }
  | { ok: false; error: ApiError };

export async function authorizeAdmin(
  auth: Pick<SupabaseClient["auth"], "getUser">,
): Promise<OwnerAuthorization> {
  const ownerId = process.env.ADMIN_USER_ID?.trim();
  const forbidden: OwnerAuthorization = {
    ok: false,
    error: {
      code: "FORBIDDEN",
      message: "This account doesn’t have admin access.",
    },
  };
  if (!ownerId) return forbidden;

  const unauthenticated: OwnerAuthorization = {
    ok: false,
    error: { code: "UNAUTHENTICATED", message: "Sign in to continue." },
  };
  try {
    // getUser verifies with Auth; cookie session data alone is not authorization.
    // https://supabase.com/docs/reference/javascript/auth-getuser
    const { data, error } = await auth.getUser();
    if (error || !data.user) return unauthenticated;
    return data.user.id === ownerId
      ? { ok: true, userId: data.user.id }
      : forbidden;
  } catch {
    return unauthenticated;
  }
}

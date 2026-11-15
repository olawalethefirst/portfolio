import "server-only";
import type { ApiError } from "@/src/api/errors";
import { updateSocial } from "@/src/db/social";
import { socialSchema, type SocialDraft } from "./social";

export async function saveSocial(value: SocialDraft): Promise<
  { ok: true; content: SocialDraft } | { ok: false; error: ApiError }
> {
  const result = socialSchema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        issues: result.error.issues.map((issue) => ({
          pointer: "/" + issue.path.map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1")).join("/"),
          message: issue.message,
        })),
      },
    };
  }
  const saved = await updateSocial(result.data);
  return saved
    ? { ok: true, content: saved }
    : { ok: false, error: { code: "NOT_FOUND", message: "Social content was not found." } };
}

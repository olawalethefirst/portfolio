import "server-only";
import type { ApiError } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
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
        issues: toApiIssues(result.error.issues),
      },
    };
  }
  const saved = await updateSocial(result.data);
  return saved
    ? { ok: true, content: saved }
    : { ok: false, error: { code: "NOT_FOUND", message: "Social content was not found." } };
}

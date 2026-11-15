import "server-only";
import type { ApiError } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
import { updateAbout } from "@/src/db/about";
import { aboutSchema, type AboutDraft } from "./about";

export async function saveAbout(value: AboutDraft): Promise<
  { ok: true; content: AboutDraft } | { ok: false; error: ApiError }
> {
  const result = aboutSchema.safeParse(value);
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
  const saved = await updateAbout(result.data);
  return saved
    ? { ok: true, content: saved }
    : { ok: false, error: { code: "NOT_FOUND", message: "About content was not found." } };
}

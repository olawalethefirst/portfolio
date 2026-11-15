import "server-only";
import type { ApiError } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
import { updateHero } from "@/src/db/hero";
import { heroSchema, type HeroDraft } from "./hero";

export async function saveHero(value: HeroDraft): Promise<
  { ok: true; content: HeroDraft } | { ok: false; error: ApiError }
> {
  const result = heroSchema.safeParse(value);
  if (!result.success) return { ok: false, error: {
    code: "VALIDATION_ERROR", message: "Check the highlighted fields.",
    issues: toApiIssues(result.error.issues),
  } };
  const saved = await updateHero(result.data);
  return saved ? { ok: true, content: saved } : { ok: false, error: {
    code: "NOT_FOUND", message: "Hero content was not found.",
  } };
}

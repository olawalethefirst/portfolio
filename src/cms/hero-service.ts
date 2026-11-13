import "server-only";
import type { ApiError } from "@/src/api/errors";
import { updateHero } from "@/src/db/hero";
import { heroSchema, type HeroDraft } from "./hero";

export async function saveHero(value: HeroDraft): Promise<
  { ok: true; content: HeroDraft } | { ok: false; error: ApiError }
> {
  const result = heroSchema.safeParse(value);
  if (!result.success) return { ok: false, error: {
    code: "VALIDATION_ERROR", message: "Check the highlighted fields.",
    issues: result.error.issues.map((issue) => ({
      pointer: "/" + issue.path.map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1")).join("/"),
      message: issue.message,
    })),
  } };
  const saved = await updateHero(result.data);
  return saved ? { ok: true, content: saved } : { ok: false, error: {
    code: "NOT_FOUND", message: "Hero content was not found.",
  } };
}

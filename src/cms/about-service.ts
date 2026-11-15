import "server-only";
import type { ApiError } from "@/src/api/errors";
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
        issues: result.error.issues.map((issue) => ({
          pointer: "/" + issue.path.map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1")).join("/"),
          message: issue.message,
        })),
      },
    };
  }
  const saved = await updateAbout(result.data);
  return saved
    ? { ok: true, content: saved }
    : { ok: false, error: { code: "NOT_FOUND", message: "About content was not found." } };
}

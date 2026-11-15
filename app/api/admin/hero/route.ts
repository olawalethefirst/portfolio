import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withPublicRead } from "@/src/api/public-read";
import { withAdminApi } from "@/src/auth/admin-api";
import { heroSchema } from "@/src/cms/hero";
import { validationErrorResponse } from "@/src/api/validation-error";
import { readHero, updateHero } from "@/src/db/hero";

const stage = heroSchema.shape.stages.shape.idea.strict();
const bodySchema = heroSchema.extend({
  stages: z.strictObject({ idea: stage, iterate: stage, solution: stage }),
}).strict();

export const GET = withPublicRead(async () => {
  const content = await readHero();
  return content ? NextResponse.json(content) : apiErrorResponse({
    code: "NOT_FOUND", message: "Hero content was not found.",
  });
});

export const PUT = withSameOrigin(withAdminApi(withContentType(
  "application/json",
  async (request: NextRequest) => {
    const invalid = () => apiErrorResponse({ code: "INVALID_REQUEST", message: "Submit complete Hero content as JSON." });
    let body: unknown;
    try { body = await request.json(); } catch { return invalid(); }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Submit complete Hero content as JSON.");
    const saved = await updateHero(parsed.data);
    return saved ? NextResponse.json(saved) : apiErrorResponse({
      code: "NOT_FOUND", message: "Hero content was not found.",
    });
  },
  "Submit complete Hero content as JSON.",
)));

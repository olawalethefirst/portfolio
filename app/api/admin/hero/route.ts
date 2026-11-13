import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { heroDraftSchema } from "@/src/cms/hero";
import { saveHero } from "@/src/cms/hero-service";
import { readHero } from "@/src/db/hero";

const stage = heroDraftSchema.shape.stages.shape.idea.strict();
const bodySchema = heroDraftSchema.extend({
  stages: z.strictObject({ idea: stage, iterate: stage, solution: stage }),
}).strict();

export const GET = withAdminApi(async () => {
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
    if (!parsed.success) return invalid();
    const result = await saveHero(parsed.data);
    return result.ok ? NextResponse.json(result.content) : apiErrorResponse(result.error);
  },
  "Submit complete Hero content as JSON.",
)));

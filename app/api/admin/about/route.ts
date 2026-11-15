import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { aboutDraftSchema } from "@/src/cms/about";
import { saveAbout } from "@/src/cms/about-service";
import { readAbout } from "@/src/db/about";

const bodySchema = aboutDraftSchema.strict();

export const GET = withAdminApi(async () => {
  const content = await readAbout();
  return content ? NextResponse.json(content) : apiErrorResponse({
    code: "NOT_FOUND", message: "About content was not found.",
  });
});

export const PUT = withSameOrigin(withAdminApi(withContentType(
  "application/json",
  async (request: NextRequest) => {
    const invalid = () => apiErrorResponse({
      code: "INVALID_REQUEST", message: "Submit complete About content as JSON.",
    });
    let body: unknown;
    try { body = await request.json(); } catch { return invalid(); }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return invalid();
    const result = await saveAbout(parsed.data);
    return result.ok ? NextResponse.json(result.content) : apiErrorResponse(result.error);
  },
  "Submit complete About content as JSON.",
)));

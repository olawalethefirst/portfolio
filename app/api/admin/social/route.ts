import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { socialDraftSchema } from "@/src/cms/social";
import { saveSocial } from "@/src/cms/social-service";
import { readSocial } from "@/src/db/social";

const bodySchema = socialDraftSchema.strict();

export const GET = withAdminApi(async () => {
  const content = await readSocial();
  return content ? NextResponse.json(content) : apiErrorResponse({
    code: "NOT_FOUND", message: "Social content was not found.",
  });
});

export const PUT = withSameOrigin(withAdminApi(withContentType(
  "application/json",
  async (request: NextRequest) => {
    const invalid = () => apiErrorResponse({
      code: "INVALID_REQUEST", message: "Submit complete Social content as JSON.",
    });
    let body: unknown;
    try { body = await request.json(); } catch { return invalid(); }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return invalid();
    const result = await saveSocial(parsed.data);
    return result.ok ? NextResponse.json(result.content) : apiErrorResponse(result.error);
  },
  "Submit complete Social content as JSON.",
)));

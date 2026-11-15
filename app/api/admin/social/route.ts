import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withPublicRead } from "@/src/api/public-read";
import { withAdminApi } from "@/src/auth/admin-api";
import { socialSchema } from "@/src/cms/social";
import { validationErrorResponse } from "@/src/api/validation-error";
import { readSocial, updateSocial } from "@/src/db/social";

const bodySchema = socialSchema.strict();

export const GET = withPublicRead(async () => {
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
    if (!parsed.success) return validationErrorResponse(parsed.error, "Submit complete Social content as JSON.");
    const saved = await updateSocial(parsed.data);
    return saved ? NextResponse.json(saved) : apiErrorResponse({
      code: "NOT_FOUND", message: "Social content was not found.",
    });
  },
  "Submit complete Social content as JSON.",
)));

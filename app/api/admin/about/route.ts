import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withPublicRead } from "@/src/api/public-read";
import { withAdminApi } from "@/src/auth/admin-api";
import { aboutSchema } from "@/src/cms/about";
import { validationErrorResponse } from "@/src/api/validation-error";
import { readAbout, updateAbout } from "@/src/db/about";

const bodySchema = aboutSchema.strict();

export const GET = withPublicRead(async () => {
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
    if (!parsed.success) return validationErrorResponse(parsed.error, "Submit complete About content as JSON.");
    const saved = await updateAbout(parsed.data);
    return saved ? NextResponse.json(saved) : apiErrorResponse({
      code: "NOT_FOUND", message: "About content was not found.",
    });
  },
  "Submit complete About content as JSON.",
)));

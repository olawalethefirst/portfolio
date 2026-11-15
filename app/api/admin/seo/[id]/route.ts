import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withPublicRead } from "@/src/api/public-read";
import { withAdminApi } from "@/src/auth/admin-api";
import { readSeo } from "@/src/db/seo";
import { seoInputSchema } from "@/src/seo/content";
import { deleteSeo, saveSeo } from "@/src/cms/seo-service";

const idSchema = z.uuid();
const bodySchema = seoInputSchema.strict();

export const GET = withPublicRead(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const parsed = idSchema.safeParse(id);
    if (!parsed.success)
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Provide a valid SEO record ID.",
      });
    const content = await readSeo(parsed.data);
    return content
      ? NextResponse.json(content)
      : apiErrorResponse({
          code: "NOT_FOUND",
          message: "SEO content was not found.",
        });
  },
);

export const PUT = withSameOrigin(
  withAdminApi(
    withContentType(
      "application/json",
      async (
        request: NextRequest,
        { params }: { params: Promise<{ id: string }> },
      ) => {
        const { id } = await params;
        const parsedId = idSchema.safeParse(id);
        if (!parsedId.success)
          return apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Provide a valid SEO record ID.",
          });
        const invalid = () =>
          apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Submit complete SEO content as JSON.",
          });
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return invalid();
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return invalid();
        const result = await saveSeo(parsedId.data, parsed.data);
        return result.ok
          ? NextResponse.json(result.content)
          : apiErrorResponse(result.error);
      },
      "Submit complete SEO content as JSON.",
    ),
  ),
);

export const DELETE = withSameOrigin(withAdminApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return apiErrorResponse({
    code: "INVALID_REQUEST", message: "Provide a valid SEO record ID.",
  });
  const result = await deleteSeo(parsed.data);
  return result.ok
    ? new NextResponse(null, { status: 204 })
    : apiErrorResponse(result.error);
}));

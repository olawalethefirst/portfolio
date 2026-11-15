import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { withSameOrigin, withContentType } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { listSeo } from "@/src/db/seo";
import { seoInputSchema } from "@/src/seo/content";
import { createSeo } from "@/src/cms/seo-service";

const bodySchema = seoInputSchema.strict();

export const GET = withAdminApi(async () => NextResponse.json(await listSeo()));

export const POST = withSameOrigin(
  withAdminApi(
    withContentType(
      "application/json",
      async (request: NextRequest) => {
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
        const result = await createSeo(parsed.data);
        return result.ok
          ? NextResponse.json(result.content, { status: 201 })
          : apiErrorResponse(result.error);
      },
      "Submit complete SEO content as JSON.",
    ),
  ),
);

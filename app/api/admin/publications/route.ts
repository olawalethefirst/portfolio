import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { insertPublication, listPublications } from "@/src/db/publications";
import { publicationDraftSchema } from "@/src/cms/publications";

export const GET = withAdminApi(async () =>
  NextResponse.json(await listPublications()),
);

export const POST = withSameOrigin(
  withContentType(
    "application/json",
    withAdminApi(async (request) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid JSON body.",
        });
      }
      const parsed = z
        .strictObject({
          intent: z.enum(["save"]),
          draft: publicationDraftSchema,
        })
        .safeParse(body);
      if (!parsed.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid Publication draft.",
        });
      return NextResponse.json(await insertPublication(parsed.data.draft), {
        status: 201,
      });
    }),
  ),
);

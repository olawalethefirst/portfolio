import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import {
  deletePublication,
  readPublication,
  updatePublication,
} from "@/src/db/publications";
import { publicationDraftSchema } from "@/src/cms/publications";

const idSchema = z.uuid();

export const GET = withAdminApi(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const parsed = idSchema.safeParse(id);
    if (!parsed.success)
      return apiErrorResponse({
        code: "INVALID_REQUEST",
        message: "Provide a valid Publication ID.",
      });
    const content = await readPublication(parsed.data);
    return content
      ? NextResponse.json(content)
      : apiErrorResponse({
          code: "NOT_FOUND",
          message: "Publication was not found.",
        });
  },
);

export const PUT = withSameOrigin(
  withContentType(
    "application/json",
    withAdminApi(
      async (
        request: NextRequest,
        { params }: { params: Promise<{ id: string }> },
      ) => {
        const { id } = await params;
        const parsedId = idSchema.safeParse(id);
        if (!parsedId.success)
          return apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Provide a valid Publication ID.",
          });
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
          .strictObject({ draft: publicationDraftSchema })
          .safeParse(body);
        if (!parsed.success)
          return apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Provide a valid Publication draft.",
          });
        const content = await updatePublication(
          parsedId.data,
          parsed.data.draft,
        );
        return content
          ? NextResponse.json(content)
          : apiErrorResponse({
              code: "NOT_FOUND",
              message: "Publication was not found.",
            });
      },
    ),
  ),
);

export const DELETE = withSameOrigin(
  withAdminApi(
    async (
      _request: NextRequest,
      { params }: { params: Promise<{ id: string }> },
    ) => {
      const { id } = await params;
      const parsed = idSchema.safeParse(id);
      if (!parsed.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid Publication ID.",
        });
      const deletedId = await deletePublication(parsed.data);
      return deletedId
        ? new NextResponse(null, { status: 204 })
        : apiErrorResponse({
            code: "NOT_FOUND",
            message: "Publication was not found.",
          });
    },
  ),
);

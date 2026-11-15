import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { publishProject, unpublishProject } from "@/src/cms/project-service";
import { projectDraftSchema } from "@/src/cms/projects";

export const PUT = withSameOrigin(
  withContentType(
    "application/json",
    withAdminApi(
      async (
        request: NextRequest,
        { params }: { params: Promise<{ id: string }> },
      ) => {
        const { id } = await params;
        const parsedId = z.uuid().safeParse(id);
        if (!parsedId.success)
          return apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Provide a valid Project ID.",
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
          .strictObject({ draft: projectDraftSchema })
          .safeParse(body);
        if (!parsed.success)
          return apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Provide a valid Project draft.",
          });
        const result = await publishProject(parsedId.data, parsed.data.draft);
        return result.ok
          ? NextResponse.json(result.content)
          : apiErrorResponse(result.error);
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
      const parsedId = z.uuid().safeParse(id);
      if (!parsedId.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid Project ID.",
        });
      const result = await unpublishProject(parsedId.data);
      return result.ok
        ? NextResponse.json(result.content)
        : apiErrorResponse(result.error);
    },
  ),
);

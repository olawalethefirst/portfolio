import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { deleteProject, readProject } from "@/src/db/projects";
import { saveProject } from "@/src/cms/project-service";
import { projectDraftSchema } from "@/src/cms/projects";

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
        message: "Provide a valid Project ID.",
      });
    const content = await readProject(parsed.data);
    return content
      ? NextResponse.json(content)
      : apiErrorResponse({
          code: "NOT_FOUND",
          message: "Project was not found.",
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
        const result = await saveProject(parsedId.data, parsed.data.draft);
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
      const parsed = idSchema.safeParse(id);
      if (!parsed.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid Project ID.",
        });
      const deletedId = await deleteProject(parsed.data);
      return deletedId
        ? new NextResponse(null, { status: 204 })
        : apiErrorResponse({
            code: "NOT_FOUND",
            message: "Project was not found.",
          });
    },
  ),
);

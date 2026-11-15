import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { insertProject, listProjects } from "@/src/db/projects";
import {
  createAndPublishProject,
} from "@/src/cms/project-service";
import { projectDraftSchema } from "@/src/cms/projects";

export const GET = withAdminApi(async () =>
  NextResponse.json(await listProjects()),
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
          intent: z.enum(["save", "publish"]),
          draft: projectDraftSchema,
        })
        .safeParse(body);
      if (!parsed.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid Project draft.",
        });
      if (parsed.data.intent === "save") {
        return NextResponse.json(await insertProject(parsed.data.draft), { status: 201 });
      }
      const result = await createAndPublishProject(parsed.data.draft);
      return result.ok
        ? NextResponse.json(result.content, { status: 201 })
        : apiErrorResponse(result.error);
    }),
  ),
);

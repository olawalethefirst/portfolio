import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, type ApiIssue } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { issueUploadPermission } from "@/src/media/upload-service";

const bodySchema = z
  .object({ contentType: z.string(), size: z.number().int() })
  .strict();
const contentTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

export const POST = withSameOrigin(
  withAdminApi(
    withContentType(
      "application/json",
      async (request: NextRequest) => {
        const invalid = () =>
          apiErrorResponse({
            code: "INVALID_REQUEST",
            message: "Submit image contentType and integer size as JSON.",
          });
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return invalid();
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return invalid();
        const { contentType, size } = parsed.data;
        const type = contentTypeSchema.safeParse(contentType);
        const issues: ApiIssue[] = [];
        if (!type.success)
          issues.push({
            pointer: "/contentType",
            message: "Choose a JPEG, PNG or WebP image.",
          });
        if (size < 1 || size > 10 * 1024 * 1024)
          issues.push({
            pointer: "/size",
            message: "Choose an image from 1 byte through 10 MiB.",
          });
        if (!type.success || issues.length)
          return apiErrorResponse({
            code: "VALIDATION_ERROR",
            message: "Check the image type and size.",
            issues,
          });
        return NextResponse.json(await issueUploadPermission(type.data));
      },
      "Submit image contentType and integer size as JSON.",
    ),
  ),
);

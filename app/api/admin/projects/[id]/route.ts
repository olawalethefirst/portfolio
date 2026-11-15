import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withAdminApi } from "@/src/auth/admin-api";
import { readProject } from "@/src/db/projects";

const idSchema = z.uuid();

export const GET = withAdminApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return apiErrorResponse({
    code: "INVALID_REQUEST", message: "Provide a valid Project ID.",
  });
  const content = await readProject(parsed.data);
  return content ? NextResponse.json(content) : apiErrorResponse({
    code: "NOT_FOUND", message: "Project was not found.",
  });
});

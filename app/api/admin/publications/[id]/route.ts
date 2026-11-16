import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withAdminApi } from "@/src/auth/admin-api";
import { readPublication } from "@/src/db/publications";

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

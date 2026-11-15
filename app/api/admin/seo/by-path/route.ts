import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/api/errors";
import { withPublicRead } from "@/src/api/public-read";
import { readSeoByPath } from "@/src/db/seo";
import { normalizeSeoPath } from "@/src/seo/content";

export const GET = withPublicRead(async (request: NextRequest) => {
  const paths = request.nextUrl.searchParams.getAll("path");
  const path = paths.length === 1 ? normalizeSeoPath(paths[0]) : undefined;
  if (!path)
    return apiErrorResponse({
      code: "INVALID_REQUEST",
      message: "Provide one valid exact SEO path.",
    });
  const content = await readSeoByPath(path);
  return content
    ? NextResponse.json(content)
    : apiErrorResponse({
        code: "NOT_FOUND",
        message: "SEO content was not found.",
      });
});

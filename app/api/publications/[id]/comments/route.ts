import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withPublicRead } from "@/src/api/public-read";
import { withContentType, withSameOrigin } from "@/src/api/request";
import {
  postPublicationComment,
  readPublicationThreads,
} from "@/src/cms/publication-comment-service";

type Context = { params: Promise<{ id: string }> };

async function publicationId(context: Context) {
  const parsed = z.uuid().safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

const invalidId = () =>
  apiErrorResponse({
    code: "INVALID_REQUEST",
    message: "Provide a valid Publication ID.",
  });

// Public and anonymous: no session, no admin guard.
export const GET = withPublicRead(
  async (_request: NextRequest, context: Context) => {
    const id = await publicationId(context);
    if (!id) return invalidId();
    const result = await readPublicationThreads(id);
    return result.ok
      ? NextResponse.json({ threads: result.threads })
      : apiErrorResponse(result.error);
  },
);

// The route owns loose structure; the service owns limits and reply rules.
const bodySchema = z.strictObject({
  parentId: z.string().nullable().optional(),
  name: z.string(),
  bodyMarkdown: z.string(),
});

export const POST = withSameOrigin(
  withContentType(
    "application/json",
    withPublicRead(async (request: NextRequest, context: Context) => {
      const id = await publicationId(context);
      if (!id) return invalidId();
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid JSON body.",
        });
      }
      const parsed = bodySchema.safeParse(body);
      if (!parsed.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid comment.",
        });
      const result = await postPublicationComment(id, parsed.data);
      return result.ok
        ? NextResponse.json({ threads: result.threads }, { status: 201 })
        : apiErrorResponse(result.error);
    }),
  ),
);

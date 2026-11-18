import "server-only";
import type { ApiError } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
import {
  insertPublicationComment,
  listPublicationComments,
  readPublicationComment,
} from "@/src/db/publication-comments";
import { readPublication } from "@/src/db/publications";
import {
  publicationCommentSchema,
  toCommentThreads,
  type CommentThreadView,
} from "./publication-comments";

type Failure = { ok: false; error: ApiError };
type PostResult = { ok: true; threads: CommentThreadView[] } | Failure;
type ReadResult = { ok: true; threads: CommentThreadView[] } | Failure;

const notFound: Failure = {
  ok: false,
  error: { code: "NOT_FOUND", message: "Publication was not found." },
};

async function isPublished(publicationId: string) {
  return (await readPublication(publicationId))?.published != null;
}

/** Comments are only exposed for published publications. */
export async function readPublicationThreads(
  publicationId: string,
): Promise<ReadResult> {
  if (!(await isPublished(publicationId))) return notFound;
  return {
    ok: true,
    threads: toCommentThreads(await listPublicationComments(publicationId)),
  };
}

export async function postPublicationComment(
  publicationId: string,
  value: unknown,
): Promise<PostResult> {
  const result = publicationCommentSchema.safeParse(value);
  if (!result.success)
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        issues: toApiIssues(result.error.issues),
      },
    };
  if (!(await isPublished(publicationId))) return notFound;

  const { parentId, ...content } = result.data;
  if (parentId !== null) {
    const parent = await readPublicationComment(parentId);
    if (!parent || parent.publicationId !== publicationId)
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The comment you are replying to was not found.",
          issues: [{ pointer: "/parentId", message: "Comment was not found." }],
        },
      };
    if (parent.parentId !== null)
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Replies can only be added to top-level comments.",
          issues: [
            { pointer: "/parentId", message: "Reply to the original comment." },
          ],
        },
      };
  }

  await insertPublicationComment({ publicationId, parentId, ...content });
  return {
    ok: true,
    threads: toCommentThreads(await listPublicationComments(publicationId)),
  };
}

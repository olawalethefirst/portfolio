import { z } from "zod";
import { CONTENT_LIMITS } from "@/src/config/content-limits";

export type PublicationComment = {
  id: string;
  publicationId: string;
  parentId: string | null;
  name: string;
  bodyMarkdown: string;
  createdAt: string;
};

export type PublicationCommentInput = {
  publicationId: string;
  parentId: string | null;
  name: string;
  bodyMarkdown: string;
};

export type CommentView = {
  id: string;
  name: string;
  date: string;
  text: string;
};
export type CommentThreadView = CommentView & { replies: CommentView[] };

function view(row: PublicationComment): CommentView {
  return {
    id: row.id,
    name: row.name,
    date: new Date(row.createdAt).toISOString(),
    text: row.bodyMarkdown,
  };
}

/** Group flat rows (oldest first) into top-level threads with flat replies. */
export function toCommentThreads(
  rows: PublicationComment[],
): CommentThreadView[] {
  const threads = new Map<string, CommentThreadView>();
  for (const row of rows)
    if (row.parentId === null)
      threads.set(row.id, { ...view(row), replies: [] });
  for (const row of rows)
    if (row.parentId !== null)
      threads.get(row.parentId)?.replies.push(view(row));
  return [...threads.values()];
}

export const publicationCommentSchema = z.object({
  parentId: z.uuid().nullable().default(null),
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(
      CONTENT_LIMITS.comment.name,
      `Use ${CONTENT_LIMITS.comment.name} characters or fewer.`,
    ),
  bodyMarkdown: z
    .string()
    .trim()
    .min(1, "Write a comment.")
    .max(
      CONTENT_LIMITS.comment.body,
      `Use ${CONTENT_LIMITS.comment.body} characters or fewer.`,
    ),
});

import { requestJson } from "@/src/api/client";
import { commentThreadsResponseSchema } from "./publication-comments";

const path = (publicationId: string) =>
  `/api/publications/${encodeURIComponent(publicationId)}/comments`;

export const publicationCommentApi = {
  list: async (publicationId: string, signal?: AbortSignal) =>
    (
      await requestJson(path(publicationId), commentThreadsResponseSchema, {
        signal,
      })
    ).threads,
  /** Resolves to the refreshed full thread list. */
  post: async (
    publicationId: string,
    input: { parentId: string | null; name: string; bodyMarkdown: string },
  ) =>
    (
      await requestJson(path(publicationId), commentThreadsResponseSchema, {
        method: "POST",
        body: input,
      })
    ).threads,
};

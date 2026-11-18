"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { publicationCommentApi } from "./publication-comment-api";
import type { CommentThreadView } from "./publication-comments";

export const publicationCommentsQueryKey = (publicationId: string) =>
  ["publication-comments", publicationId] as const;

/** Seeded from the server-rendered threads, so the first paint needs no fetch. */
export function usePublicationCommentsQuery(
  publicationId: string,
  initialThreads: CommentThreadView[],
) {
  return useQuery({
    queryKey: publicationCommentsQueryKey(publicationId),
    queryFn: ({ signal }) => publicationCommentApi.list(publicationId, signal),
    initialData: initialThreads,
    staleTime: 60_000,
  });
}

/** The POST response is the full refreshed list, so it replaces the cache. */
export function usePostPublicationComment(publicationId: string) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: {
      parentId: string | null;
      name: string;
      bodyMarkdown: string;
    }) => publicationCommentApi.post(publicationId, input),
    onSuccess: (threads) =>
      client.setQueryData(publicationCommentsQueryKey(publicationId), threads),
  });
  return { post: mutation.mutateAsync, pending: mutation.isPending };
}

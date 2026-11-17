"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/src/api/client";
import { useCmsAccount } from "./CmsQueryProvider";
import { publicationApi } from "./publication-api";
import type {
  PublicationAction,
  PublicationDraft,
  PublicationRecord,
} from "./publications";

export const publicationsQueryKey = (accountId: string) =>
  ["cms", accountId, "publications"] as const;

export function usePublicationsQuery() {
  return useQuery({
    queryKey: publicationsQueryKey(useCmsAccount()),
    queryFn: ({ signal }) => publicationApi.list(signal),
  });
}

/** Keep the cache untouched unless the submitted IDs match it exactly. */
function submittedOrder(records: PublicationRecord[], ids: readonly string[]) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const moved = ids
    .map((id) => byId.get(id))
    .filter((record) => record !== undefined);
  return moved.length === records.length ? moved : records;
}

/** Stale membership and lost responses both leave the client unsure of truth. */
function needsServerTruth(failure: unknown) {
  if (!(failure instanceof ApiRequestError)) return true;
  return failure.kind !== "server" || failure.error?.code === "CONFLICT";
}

/**
 * The submitted order shows at once; only the server settles membership.
 * Callers disable their ordering controls while `pending` is true.
 */
export function useReorderPublications() {
  const queryKey = publicationsQueryKey(useCmsAccount());
  const client = useQueryClient();
  // Forward only the IDs; useMutation also passes its own context argument.
  const mutation = useMutation({
    mutationFn: (ids: readonly string[]) => publicationApi.order(ids),
  });
  async function reorder(ids: readonly string[]) {
    const previous = client.getQueryData<PublicationRecord[]>(queryKey);
    try {
      await client.cancelQueries({ queryKey });
      if (previous)
        client.setQueryData(queryKey, submittedOrder(previous, ids));
      client.setQueryData(queryKey, await mutation.mutateAsync(ids));
    } catch (failure) {
      if (previous) client.setQueryData(queryKey, previous);
      if (needsServerTruth(failure))
        void client.invalidateQueries({ queryKey });
      throw failure;
    }
  }
  return { reorder, pending: mutation.isPending };
}

type Commit =
  | { kind: "create"; content: PublicationRecord }
  | { kind: "save"; content: PublicationRecord }
  | { kind: "publish"; content: PublicationRecord }
  | { kind: "unpublish"; id: string; draft: PublicationDraft }
  | { kind: "delete"; id: string };

/**
 * PUT /:id (Save) always reports published: null, since it does not own that
 * field — only /published and first-publish create do. Preserve whatever the
 * cache already knows rather than letting a Save response erase it.
 */
function applyCommit(
  records: PublicationRecord[] | undefined,
  commit: Commit,
): PublicationRecord[] | undefined {
  if (!records) return records;
  switch (commit.kind) {
    case "delete":
      return records.filter((record) => record.id !== commit.id);
    case "unpublish":
      return records.map((record) =>
        record.id === commit.id ? { ...record, published: null } : record,
      );
    case "create":
      return [...records, commit.content];
    case "publish":
      return records.map((record) =>
        record.id === commit.content.id ? commit.content : record,
      );
    case "save":
      return records.map((record) =>
        record.id === commit.content.id
          ? { ...commit.content, published: record.published }
          : record,
      );
  }
}

async function commitPublication(
  id: string,
  draft: PublicationDraft,
  action: PublicationAction | "delete",
): Promise<Commit> {
  if (id === "new")
    return {
      kind: "create",
      content: await publicationApi.create(
        draft,
        action === "publish" ? "publish" : "save",
      ),
    };
  switch (action) {
    case "save":
      return { kind: "save", content: await publicationApi.save(id, draft) };
    case "publish":
      return {
        kind: "publish",
        content: await publicationApi.publish(id, draft),
      };
    case "unpublish":
      return {
        kind: "unpublish",
        id,
        draft: await publicationApi.unpublish(id),
      };
    case "delete":
      await publicationApi.remove(id);
      return { kind: "delete", id };
  }
}

/**
 * A newly created Publication is appended to the cached collection at the
 * DB's default position. A reorder is already available to place it precisely.
 */
export function usePublicationMutations() {
  const queryKey = publicationsQueryKey(useCmsAccount());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: {
      id: string;
      draft: PublicationDraft;
      action: PublicationAction | "delete";
    }) => commitPublication(input.id, input.draft, input.action),
  });
  async function commit(
    id: string,
    draft: PublicationDraft,
    action: PublicationAction | "delete",
  ) {
    // Start the mutation first so `pending` flips true in this same tick,
    // matching the fieldset's synchronous disable-on-submit contract.
    const request = mutation.mutateAsync({ id, draft, action });
    try {
      await client.cancelQueries({ queryKey });
      const result = await request;
      client.setQueryData<PublicationRecord[]>(queryKey, (records) =>
        applyCommit(records, result),
      );
      return result.kind === "unpublish"
        ? result.draft
        : result.kind === "delete"
          ? undefined
          : result.content;
    } catch (failure) {
      if (needsServerTruth(failure))
        void client.invalidateQueries({ queryKey });
      throw failure;
    }
  }
  return { commit, pending: mutation.isPending };
}

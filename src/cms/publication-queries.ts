"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/src/api/client";
import { useCmsAccount } from "./CmsQueryProvider";
import { publicationApi } from "./publication-api";
import type { PublicationRecord } from "./publications";

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

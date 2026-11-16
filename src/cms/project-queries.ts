"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/src/api/client";
import { useCmsAccount } from "./CmsQueryProvider";
import { projectApi } from "./project-api";
import type { ProjectAction, ProjectDraft, ProjectRecord } from "./projects";

export const projectsQueryKey = (accountId: string) =>
  ["cms", accountId, "projects"] as const;

export function useProjectsQuery() {
  return useQuery({
    queryKey: projectsQueryKey(useCmsAccount()),
    queryFn: ({ signal }) => projectApi.list(signal),
  });
}

/** Keep the cache untouched unless the submitted IDs match it exactly. */
function submittedOrder(records: ProjectRecord[], ids: readonly string[]) {
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
export function useReorderProjects() {
  const queryKey = projectsQueryKey(useCmsAccount());
  const client = useQueryClient();
  // Forward only the IDs; useMutation also passes its own context argument.
  const mutation = useMutation({
    mutationFn: (ids: readonly string[]) => projectApi.order(ids),
  });
  async function reorder(ids: readonly string[]) {
    const previous = client.getQueryData<ProjectRecord[]>(queryKey);
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
  | { kind: "create"; content: ProjectRecord }
  | { kind: "save"; content: ProjectRecord }
  | { kind: "publish"; content: ProjectRecord }
  | { kind: "unpublish"; id: string; draft: ProjectDraft }
  | { kind: "delete"; id: string };

/**
 * PUT /:id (Save) always reports published: null, since it does not own that
 * field — only /published and first-publish create do. Preserve whatever the
 * cache already knows rather than letting a Save response erase it.
 */
function applyCommit(
  records: ProjectRecord[] | undefined,
  commit: Commit,
): ProjectRecord[] | undefined {
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

async function commitProject(
  id: string,
  draft: ProjectDraft,
  action: ProjectAction,
): Promise<Commit> {
  if (id === "new")
    return {
      kind: "create",
      content: await projectApi.create(
        draft,
        action === "publish" ? "publish" : "save",
      ),
    };
  switch (action) {
    case "save":
      return { kind: "save", content: await projectApi.save(id, draft) };
    case "publish":
      return { kind: "publish", content: await projectApi.publish(id, draft) };
    case "unpublish":
      return { kind: "unpublish", id, draft: await projectApi.unpublish(id) };
    case "delete":
      await projectApi.remove(id);
      return { kind: "delete", id };
  }
}

/**
 * A newly created Project is appended to the cached collection at the DB's
 * default position. A reorder is already available to place it precisely.
 */
export function useProjectMutations() {
  const queryKey = projectsQueryKey(useCmsAccount());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: {
      id: string;
      draft: ProjectDraft;
      action: ProjectAction;
    }) => commitProject(input.id, input.draft, input.action),
  });
  async function commit(
    id: string,
    draft: ProjectDraft,
    action: ProjectAction,
  ) {
    // Start the mutation first so `pending` flips true in this same tick,
    // matching the fieldset's synchronous disable-on-submit contract.
    const request = mutation.mutateAsync({ id, draft, action });
    try {
      await client.cancelQueries({ queryKey });
      const result = await request;
      client.setQueryData<ProjectRecord[]>(queryKey, (records) =>
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

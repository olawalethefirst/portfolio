import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/src/api/client";
import { CmsQueryProvider } from "./CmsQueryProvider";
import { projectApi } from "./project-api";
import { useProjectMutations, useProjectsQuery } from "./project-queries";
import { emptyProject, type ProjectRecord } from "./projects";
import { firstId, mockProjectApi, projectRecords } from "./test-support/mockProjectApi";

afterEach(() => vi.restoreAllMocks());

const wrapper = ({ children }: { children: ReactNode }) => (
  <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider>
);
const screens = () =>
  renderHook(() => ({ query: useProjectsQuery(), mutations: useProjectMutations() }), { wrapper });
const find = (records: ProjectRecord[] | undefined, id: string) =>
  records?.find((record) => record.id === id);

it("saves a draft without disturbing the cached published snapshot", async () => {
  // PUT /:id always reports published: null; only /published owns that field.
  mockProjectApi(undefined, [
    { id: firstId, draft: emptyProject(), published: { ...emptyProject(), name: "Live" } },
  ]);
  const save = vi.spyOn(projectApi, "save").mockResolvedValue({
    id: firstId, draft: { ...emptyProject(), name: "Edited" }, published: null,
  });
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(1));
  await act(async () => {
    await result.current.mutations.commit(firstId, { ...emptyProject(), name: "Edited" }, "save");
  });
  expect(save).toHaveBeenCalledWith(firstId, { ...emptyProject(), name: "Edited" });
  await waitFor(() => {
    const record = find(result.current.query.data, firstId);
    expect(record?.draft.name).toBe("Edited");
    expect(record?.published?.name).toBe("Live");
  });
});

it("publishes and replaces both the draft and the published snapshot", async () => {
  mockProjectApi();
  const content = { id: firstId, draft: { ...emptyProject(), name: "Shipped" }, published: { ...emptyProject(), name: "Shipped" } };
  vi.spyOn(projectApi, "publish").mockResolvedValue(content);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit(firstId, content.draft, "publish");
  });
  await waitFor(() => expect(find(result.current.query.data, firstId)).toEqual(content));
});

it("unpublishes by clearing only the cached published snapshot", async () => {
  mockProjectApi();
  vi.spyOn(projectApi, "unpublish").mockResolvedValue({ ...emptyProject(), name: "Still saved" });
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit(firstId, emptyProject(), "unpublish");
  });
  await waitFor(() => {
    const record = find(result.current.query.data, firstId);
    expect(record?.published).toBeNull();
  });
});

it("deletes by removing the record from the cached collection", async () => {
  mockProjectApi();
  vi.spyOn(projectApi, "remove").mockResolvedValue(undefined);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit(firstId, emptyProject(), "delete");
  });
  await waitFor(() => expect(find(result.current.query.data, firstId)).toBeUndefined());
  expect(result.current.query.data).toHaveLength(1);
});

it("creates a new Project and appends it to the cached collection", async () => {
  mockProjectApi();
  const created = { id: "33333333-3333-4333-8333-333333333333", draft: { ...emptyProject(), name: "Fresh" }, published: null };
  const create = vi.spyOn(projectApi, "create").mockResolvedValue(created);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit("new", created.draft, "save");
  });
  expect(create).toHaveBeenCalledWith(created.draft, "save");
  await waitFor(() => expect(find(result.current.query.data, created.id)).toEqual(created));
});

it("returns the canonical record so the caller can act on the server ID", async () => {
  mockProjectApi();
  const created = { id: "33333333-3333-4333-8333-333333333333", draft: { ...emptyProject(), name: "Fresh" }, published: null };
  vi.spyOn(projectApi, "create").mockResolvedValue(created);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  let resolved!: typeof created;
  await act(async () => {
    resolved = (await result.current.mutations.commit("new", created.draft, "save")) as typeof created;
  });
  expect(resolved).toEqual(created);
});

it("reports pending while a commit is in flight", async () => {
  mockProjectApi();
  let finish!: (record: { id: string; draft: ReturnType<typeof emptyProject>; published: null }) => void;
  vi.spyOn(projectApi, "save").mockImplementation(
    () => new Promise((resolve) => { finish = resolve; }),
  );
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  expect(result.current.mutations.pending).toBe(false);
  let committing!: Promise<unknown>;
  act(() => {
    committing = result.current.mutations.commit(firstId, emptyProject(), "save");
  });
  await waitFor(() => expect(result.current.mutations.pending).toBe(true));
  await act(async () => {
    finish({ id: firstId, draft: emptyProject(), published: null });
    await committing;
  });
  await waitFor(() => expect(result.current.mutations.pending).toBe(false));
});

it("refetches instead of guessing after a lost response", async () => {
  mockProjectApi();
  vi.spyOn(projectApi, "save").mockRejectedValue(new ApiRequestError("network", null));
  const list = vi.spyOn(projectApi, "list").mockResolvedValue(projectRecords());
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  list.mockClear();
  await act(async () => {
    await expect(
      result.current.mutations.commit(firstId, emptyProject(), "save"),
    ).rejects.toThrow();
  });
  await waitFor(() => expect(list).toHaveBeenCalled());
});

it("does not refetch after an ordinary validation failure", async () => {
  mockProjectApi();
  vi.spyOn(projectApi, "save").mockRejectedValue(
    new ApiRequestError("server", 422, { code: "VALIDATION_ERROR", message: "Check the highlighted fields." }),
  );
  const list = vi.spyOn(projectApi, "list").mockResolvedValue(projectRecords());
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  list.mockClear();
  await act(async () => {
    await expect(
      result.current.mutations.commit(firstId, emptyProject(), "save"),
    ).rejects.toThrow();
  });
  expect(list).not.toHaveBeenCalled();
});


import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/src/api/client";
import { CmsQueryProvider } from "./CmsQueryProvider";
import { publicationApi } from "./publication-api";
import {
  usePublicationMutations,
  usePublicationsQuery,
} from "./publication-queries";
import { emptyPublication, type PublicationRecord } from "./publications";
import {
  firstId,
  mockPublicationApi,
  publicationRecords,
} from "./test-support/mockPublicationApi";

afterEach(() => vi.restoreAllMocks());

const wrapper = ({ children }: { children: ReactNode }) => (
  <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider>
);
const screens = () =>
  renderHook(
    () => ({
      query: usePublicationsQuery(),
      mutations: usePublicationMutations(),
    }),
    { wrapper },
  );
const find = (records: PublicationRecord[] | undefined, id: string) =>
  records?.find((record) => record.id === id);

it("saves a draft without disturbing the cached published snapshot", async () => {
  // PUT /:id always reports published: null; only /published owns that field.
  mockPublicationApi(undefined, [
    {
      id: firstId,
      draft: emptyPublication(),
      published: { ...emptyPublication(), title: "Live" },
    },
  ]);
  const save = vi.spyOn(publicationApi, "save").mockResolvedValue({
    id: firstId,
    draft: { ...emptyPublication(), title: "Edited" },
    published: null,
  });
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(1));
  await act(async () => {
    await result.current.mutations.commit(
      firstId,
      { ...emptyPublication(), title: "Edited" },
      "save",
    );
  });
  expect(save).toHaveBeenCalledWith(firstId, {
    ...emptyPublication(),
    title: "Edited",
  });
  await waitFor(() => {
    const record = find(result.current.query.data, firstId);
    expect(record?.draft.title).toBe("Edited");
    expect(record?.published?.title).toBe("Live");
  });
});

it("publishes and replaces both the draft and the published snapshot", async () => {
  mockPublicationApi();
  const content = {
    id: firstId,
    draft: { ...emptyPublication(), title: "Shipped" },
    published: { ...emptyPublication(), title: "Shipped" },
  };
  vi.spyOn(publicationApi, "publish").mockResolvedValue(content);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit(firstId, content.draft, "publish");
  });
  await waitFor(() =>
    expect(find(result.current.query.data, firstId)).toEqual(content),
  );
});

it("unpublishes by clearing only the cached published snapshot", async () => {
  mockPublicationApi();
  vi.spyOn(publicationApi, "unpublish").mockResolvedValue({
    ...emptyPublication(),
    title: "Still saved",
  });
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit(
      firstId,
      emptyPublication(),
      "unpublish",
    );
  });
  await waitFor(() => {
    const record = find(result.current.query.data, firstId);
    expect(record?.published).toBeNull();
  });
});

it("deletes by removing the record from the cached collection", async () => {
  mockPublicationApi();
  vi.spyOn(publicationApi, "remove").mockResolvedValue(undefined);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit(
      firstId,
      emptyPublication(),
      "delete",
    );
  });
  await waitFor(() =>
    expect(find(result.current.query.data, firstId)).toBeUndefined(),
  );
  expect(result.current.query.data).toHaveLength(1);
});

it("creates a new Publication and appends it to the cached collection", async () => {
  mockPublicationApi();
  const created = {
    id: "33333333-3333-4333-8333-333333333333",
    draft: { ...emptyPublication(), title: "Fresh" },
    published: null,
  };
  const create = vi.spyOn(publicationApi, "create").mockResolvedValue(created);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  await act(async () => {
    await result.current.mutations.commit("new", created.draft, "save");
  });
  expect(create).toHaveBeenCalledWith(created.draft, "save");
  await waitFor(() =>
    expect(find(result.current.query.data, created.id)).toEqual(created),
  );
});

it("returns the canonical record so the caller can act on the server ID", async () => {
  mockPublicationApi();
  const created = {
    id: "33333333-3333-4333-8333-333333333333",
    draft: { ...emptyPublication(), title: "Fresh" },
    published: null,
  };
  vi.spyOn(publicationApi, "create").mockResolvedValue(created);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  let resolved!: typeof created;
  await act(async () => {
    resolved = (await result.current.mutations.commit(
      "new",
      created.draft,
      "save",
    )) as typeof created;
  });
  expect(resolved).toEqual(created);
});

it("reports pending while a commit is in flight", async () => {
  mockPublicationApi();
  let finish!: (record: {
    id: string;
    draft: ReturnType<typeof emptyPublication>;
    published: null;
  }) => void;
  vi.spyOn(publicationApi, "save").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  expect(result.current.mutations.pending).toBe(false);
  let committing!: Promise<unknown>;
  act(() => {
    committing = result.current.mutations.commit(
      firstId,
      emptyPublication(),
      "save",
    );
  });
  await waitFor(() => expect(result.current.mutations.pending).toBe(true));
  await act(async () => {
    finish({ id: firstId, draft: emptyPublication(), published: null });
    await committing;
  });
  await waitFor(() => expect(result.current.mutations.pending).toBe(false));
});

it("refetches instead of guessing after a lost response", async () => {
  mockPublicationApi();
  vi.spyOn(publicationApi, "save").mockRejectedValue(
    new ApiRequestError("network", null),
  );
  const list = vi
    .spyOn(publicationApi, "list")
    .mockResolvedValue(publicationRecords());
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  list.mockClear();
  await act(async () => {
    await expect(
      result.current.mutations.commit(firstId, emptyPublication(), "save"),
    ).rejects.toThrow();
  });
  await waitFor(() => expect(list).toHaveBeenCalled());
});

it("does not refetch after an ordinary validation failure", async () => {
  mockPublicationApi();
  vi.spyOn(publicationApi, "save").mockRejectedValue(
    new ApiRequestError("server", 422, {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
    }),
  );
  const list = vi
    .spyOn(publicationApi, "list")
    .mockResolvedValue(publicationRecords());
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  list.mockClear();
  await act(async () => {
    await expect(
      result.current.mutations.commit(firstId, emptyPublication(), "save"),
    ).rejects.toThrow();
  });
  expect(list).not.toHaveBeenCalled();
});

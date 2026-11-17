import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/src/api/client";
import { CmsQueryProvider } from "./CmsQueryProvider";
import { publicationApi } from "./publication-api";
import {
  usePublicationsQuery,
  useReorderPublications,
} from "./publication-queries";
import {
  firstId,
  mockPublicationApi,
  publicationRecords,
  secondId,
} from "./test-support/mockPublicationApi";

afterEach(() => vi.restoreAllMocks());

const wrapper = ({ children }: { children: ReactNode }) => (
  <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider>
);
const screens = () =>
  renderHook(
    () => ({
      query: usePublicationsQuery(),
      ordering: useReorderPublications(),
    }),
    { wrapper },
  );
const ids = (records?: { id: string }[]) => records?.map((record) => record.id);

it("reads the saved collection in server order", async () => {
  mockPublicationApi();
  const { result } = screens();
  await waitFor(() =>
    expect(ids(result.current.query.data)).toEqual([firstId, secondId]),
  );
});

it("shows the submitted order before the server replies", async () => {
  let finish!: () => void;
  const request = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  mockPublicationApi(request);
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  let ordering!: Promise<void>;
  act(() => {
    ordering = result.current.ordering.reorder([secondId, firstId]);
  });
  await waitFor(() =>
    expect(ids(result.current.query.data)).toEqual([secondId, firstId]),
  );
  await waitFor(() => expect(result.current.ordering.pending).toBe(true));
  await act(async () => {
    finish();
    await ordering;
  });
  await waitFor(() => expect(result.current.ordering.pending).toBe(false));
});

it("adopts the canonical collection instead of its own optimistic guess", async () => {
  mockPublicationApi();
  const canonical = publicationRecords()
    .reverse()
    .map((record) => ({ ...record, published: { ...record.draft } }));
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  vi.spyOn(publicationApi, "order").mockResolvedValue(canonical);
  await act(async () => {
    await result.current.ordering.reorder([secondId, firstId]);
  });
  await waitFor(() => expect(result.current.query.data).toEqual(canonical));
});

it("restores the previous order and releases the lock when the request fails", async () => {
  mockPublicationApi();
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  vi.spyOn(publicationApi, "order").mockRejectedValueOnce(
    new ApiRequestError("network", null),
  );
  await act(async () => {
    await expect(
      result.current.ordering.reorder([secondId, firstId]),
    ).rejects.toThrow();
  });
  expect(ids(result.current.query.data)).toEqual([firstId, secondId]);
  expect(result.current.ordering.pending).toBe(false);
  await act(async () => {
    await result.current.ordering.reorder([secondId, firstId]);
  });
  expect(ids(result.current.query.data)).toEqual([secondId, firstId]);
});

it("replaces a stale collection with server truth after a membership conflict", async () => {
  mockPublicationApi();
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  vi.spyOn(publicationApi, "order").mockRejectedValue(
    new ApiRequestError("server", 409, {
      code: "CONFLICT",
      message: "The Publication list changed. Reload it and order again.",
    }),
  );
  vi.spyOn(publicationApi, "list").mockResolvedValue([publicationRecords()[0]]);
  await act(async () => {
    await expect(
      result.current.ordering.reorder([secondId, firstId]),
    ).rejects.toThrow();
  });
  await waitFor(() =>
    expect(ids(result.current.query.data)).toEqual([firstId]),
  );
});

it("reports pending so callers can disable ordering controls", async () => {
  let finish!: () => void;
  mockPublicationApi(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = screens();
  await waitFor(() => expect(result.current.query.data).toHaveLength(2));
  expect(result.current.ordering.pending).toBe(false);
  let ordering!: Promise<void>;
  act(() => {
    ordering = result.current.ordering.reorder([secondId, firstId]);
  });
  await waitFor(() => expect(result.current.ordering.pending).toBe(true));
  await act(async () => {
    finish();
    await ordering;
  });
  await waitFor(() =>
    expect(ids(result.current.query.data)).toEqual([secondId, firstId]),
  );
});

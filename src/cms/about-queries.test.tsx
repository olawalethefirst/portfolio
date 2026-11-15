import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useAboutQuery, useSaveAbout } from "./about-queries";
import { mockAboutApi } from "./test-support/mockAboutApi";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { initialAbout, type AboutDraft } from "./about";

afterEach(() => vi.restoreAllMocks());

it("captures the submitted snapshot and blocks saves before React rerenders", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  mockAboutApi(request);
  const { result } = renderHook(() => ({ query: useAboutQuery(), mutation: useSaveAbout() }), { wrapper: ({ children }: { children: ReactNode }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialAbout));
  const submitted = structuredClone(initialAbout);
  submitted.heading = "Submitted heading";
  const biography = submitted.biography;
  let saving!: Promise<AboutDraft>;
  let duplicate!: Promise<AboutDraft>;
  act(() => {
    saving = result.current.mutation.save(submitted);
    duplicate = result.current.mutation.save(submitted);
  });
  await expect(duplicate).rejects.toThrow("A save is already in progress.");
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  submitted.heading = "Newer heading";
  submitted.biography = "Newer biography";
  await act(async () => { finish(); await saving; });
  await waitFor(() => expect(result.current.query.data?.heading).toBe("Submitted heading"));
  expect(result.current.query.data?.biography).toBe(biography);
});

it("releases the save lock after failure so the request can be retried", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  mockAboutApi(request);
  const { result } = renderHook(() => ({ query: useAboutQuery(), mutation: useSaveAbout() }), { wrapper: ({ children }: { children: ReactNode }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialAbout));
  await act(async () => { await expect(result.current.mutation.save({ ...initialAbout, heading: "Retry heading" })).rejects.toThrow("Save failed"); });
  expect(result.current.mutation.pending).toBe(false);
  expect(result.current.query.data?.heading).toBe(initialAbout.heading);
  await act(async () => { await result.current.mutation.save({ ...initialAbout, heading: "Retry heading" }); });
  await waitFor(() => expect(result.current.query.data?.heading).toBe("Retry heading"));
});

it("rejects incomplete direct saves before requesting and permits correction", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  mockAboutApi(request);
  const { result } = renderHook(() => ({ query: useAboutQuery(), mutation: useSaveAbout() }), { wrapper: ({ children }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialAbout));
  await act(async () => { await expect(result.current.mutation.save({ heading: " ", biography: "" })).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.query.data).toEqual(initialAbout);
  expect(result.current.mutation.pending).toBe(false);
  await act(async () => { await result.current.mutation.save(initialAbout); });
  expect(request).toHaveBeenCalledTimes(1);
});

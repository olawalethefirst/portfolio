import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useHeroQuery, useSaveHero } from "./hero-queries";
import { mockHeroApi } from "./test-support/mockHeroApi";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { initialHero, type HeroDraft } from "./hero";

afterEach(() => vi.restoreAllMocks());

it("captures the submitted snapshot and blocks saves before React rerenders", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  mockHeroApi(request);
  const { result } = renderHook(() => ({ query: useHeroQuery(), mutation: useSaveHero() }), { wrapper: ({ children }: { children: ReactNode }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialHero));
  const submitted = structuredClone(initialHero);
  submitted.headline = "Submitted headline";
  const tagline = submitted.stages.idea.tagline;
  let saving!: Promise<HeroDraft>;
  let duplicate!: Promise<HeroDraft>;
  act(() => {
    saving = result.current.mutation.save(submitted);
    duplicate = result.current.mutation.save(submitted);
  });
  await expect(duplicate).rejects.toThrow("A save is already in progress.");
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  submitted.headline = "Newer headline";
  submitted.stages.idea.tagline = "Newer tagline";
  await act(async () => { finish(); await saving; });
  await waitFor(() => expect(result.current.query.data?.headline).toBe("Submitted headline"));
  expect(result.current.query.data?.stages.idea.tagline).toBe(tagline);
});

it("releases the save lock after failure so the request can be retried", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  mockHeroApi(request);
  const { result } = renderHook(() => ({ query: useHeroQuery(), mutation: useSaveHero() }), { wrapper: ({ children }: { children: ReactNode }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialHero));
  await act(async () => { await expect(result.current.mutation.save({ ...initialHero, headline: "Retry headline" })).rejects.toThrow("Save failed"); });
  expect(result.current.mutation.pending).toBe(false);
  expect(result.current.query.data?.headline).toBe(initialHero.headline);
  await act(async () => { await result.current.mutation.save({ ...initialHero, headline: "Retry headline" }); });
  await waitFor(() => expect(result.current.query.data?.headline).toBe("Retry headline"));
});

it("rejects incomplete and over-limit direct saves before requesting and permits correction", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  mockHeroApi(request);
  const { result } = renderHook(() => ({ query: useHeroQuery(), mutation: useSaveHero() }), { wrapper: ({ children }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialHero));
  const draft = structuredClone(initialHero);
  draft.stages.iterate.description = "x".repeat(57);
  await act(async () => { await expect(result.current.mutation.save(draft)).rejects.toThrow(); });
  draft.stages.iterate.description = " ";
  await act(async () => { await expect(result.current.mutation.save(draft)).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.query.data).toEqual(initialHero);
  expect(result.current.mutation.pending).toBe(false);
  await act(async () => { await result.current.mutation.save(initialHero); });
  expect(request).toHaveBeenCalledTimes(1);
});

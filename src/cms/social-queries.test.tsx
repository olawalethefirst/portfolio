import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useSocialQuery, useSaveSocial } from "./social-queries";
import { mockSocialApi } from "./test-support/mockSocialApi";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { initialSocial, type SocialDraft } from "./social";

afterEach(() => vi.restoreAllMocks());

it("captures the submitted snapshot and blocks saves before React rerenders", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  mockSocialApi(request);
  const { result } = renderHook(() => ({ query: useSocialQuery(), mutation: useSaveSocial() }), { wrapper: ({ children }: { children: ReactNode }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialSocial));
  const submitted = structuredClone(initialSocial);
  submitted.github = "https://example.com/submitted";
  const linkedin = submitted.linkedin;
  let saving!: Promise<SocialDraft>;
  let duplicate!: Promise<SocialDraft>;
  act(() => {
    saving = result.current.mutation.save(submitted);
    duplicate = result.current.mutation.save(submitted);
  });
  await expect(duplicate).rejects.toThrow("A save is already in progress.");
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  submitted.github = "https://example.com/newer";
  submitted.linkedin = "https://example.com/linkedin";
  await act(async () => { finish(); await saving; });
  await waitFor(() => expect(result.current.query.data?.github).toBe("https://example.com/submitted"));
  expect(result.current.query.data?.linkedin).toBe(linkedin);
});

it("releases the save lock after failure so the request can be retried", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  mockSocialApi(request);
  const { result } = renderHook(() => ({ query: useSocialQuery(), mutation: useSaveSocial() }), { wrapper: ({ children }: { children: ReactNode }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialSocial));
  await act(async () => { await expect(result.current.mutation.save({ ...initialSocial, github: "https://example.com/retry" })).rejects.toThrow("Save failed"); });
  expect(result.current.mutation.pending).toBe(false);
  expect(result.current.query.data?.github).toBe(initialSocial.github);
  await act(async () => { await result.current.mutation.save({ ...initialSocial, github: "https://example.com/retry" }); });
  await waitFor(() => expect(result.current.query.data?.github).toBe("https://example.com/retry"));
});

it("rejects incomplete direct saves before requesting and permits correction", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  mockSocialApi(request);
  const { result } = renderHook(() => ({ query: useSocialQuery(), mutation: useSaveSocial() }), { wrapper: ({ children }) => <CmsQueryProvider accountId="test-owner">{children}</CmsQueryProvider> });
  await waitFor(() => expect(result.current.query.data).toEqual(initialSocial));
  await act(async () => { await expect(result.current.mutation.save({ github: "https://user:pass@example.com", linkedin: "", x: "" })).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.query.data).toEqual(initialSocial);
  expect(result.current.mutation.pending).toBe(false);
  await act(async () => { await result.current.mutation.save({ ...initialSocial, github: "  HTTPS://code.example.com/profile  " }); });
  expect(request).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(result.current.query.data?.github).toBe("  HTTPS://code.example.com/profile  "));
});

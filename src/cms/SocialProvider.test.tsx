import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SocialProvider, useSocial } from "./SocialProvider";
import { initialSocial } from "./social";

it("rejects invalid direct saves before requesting and preserves raw corrected URLs", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(useSocial, { wrapper: ({ children }) => <SocialProvider request={request}>{children}</SocialProvider> });
  await act(async () => { await expect(result.current.save({ ...initialSocial, github: "https://user:password@example.com" })).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.saved).toEqual(initialSocial);
  expect(result.current.pending).toBe(false);
  const corrected = { ...initialSocial, github: "  HTTPS://code.example.com/profile  " };
  await act(async () => { await result.current.save(corrected); });
  expect(result.current.saved).toEqual(corrected);
});

it("captures input before caller mutation and blocks duplicate direct saves", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { result } = renderHook(useSocial, { wrapper: ({ children }) => <SocialProvider request={request}>{children}</SocialProvider> });
  const draft = { ...initialSocial, github: "https://example.com/submitted" };
  let saving!: Promise<void>;
  await act(async () => {
    saving = result.current.save(draft);
    await expect(result.current.save(draft)).rejects.toThrow("already in progress");
    draft.github = "https://example.com/newer";
  });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await saving; });
  expect(result.current.saved.github).toBe("https://example.com/submitted");
});

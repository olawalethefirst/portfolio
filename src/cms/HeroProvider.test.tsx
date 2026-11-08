import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { HeroProvider, useHero } from "./HeroProvider";
import { initialHero } from "./hero";

it("captures the submitted snapshot and blocks saves before React rerenders", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { result } = renderHook(useHero, { wrapper: ({ children }: { children: ReactNode }) => <HeroProvider request={request}>{children}</HeroProvider> });
  const submitted = structuredClone(initialHero);
  submitted.headline = "Submitted headline";
  const tagline = submitted.stages.idea.tagline;
  let saving!: Promise<void>;
  let duplicate!: Promise<void>;
  act(() => {
    saving = result.current.save(submitted);
    duplicate = result.current.save(submitted);
  });
  await expect(duplicate).rejects.toThrow("A save is already in progress.");
  expect(request).toHaveBeenCalledTimes(1);
  submitted.headline = "Newer headline";
  submitted.stages.idea.tagline = "Newer tagline";
  await act(async () => { finish(); await saving; });
  expect(result.current.saved.headline).toBe("Submitted headline");
  expect(result.current.saved.stages.idea.tagline).toBe(tagline);
});

it("releases the save lock after failure so the request can be retried", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  const { result } = renderHook(useHero, { wrapper: ({ children }: { children: ReactNode }) => <HeroProvider request={request}>{children}</HeroProvider> });
  await act(async () => { await expect(result.current.save({ ...initialHero, headline: "Retry headline" })).rejects.toThrow("Save failed"); });
  expect(result.current.pending).toBe(false);
  expect(result.current.saved.headline).toBe(initialHero.headline);
  await act(async () => { await result.current.save({ ...initialHero, headline: "Retry headline" }); });
  expect(result.current.saved.headline).toBe("Retry headline");
});

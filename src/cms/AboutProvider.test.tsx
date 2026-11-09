import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AboutProvider, useAbout } from "./AboutProvider";

it("rejects invalid direct saves without requesting and permits a corrected retry", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(useAbout, { wrapper: ({ children }) => <AboutProvider request={request}>{children}</AboutProvider> });
  const baseline = result.current.saved;
  await act(async () => { await expect(result.current.save({ heading: " ", biography: "" })).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.saved).toEqual(baseline);
  expect(result.current.pending).toBe(false);
  await act(async () => { await result.current.save({ heading: " Heading ", biography: " Biography " }); });
  expect(result.current.saved).toEqual({ heading: " Heading ", biography: " Biography " });
});

it("locks duplicate requests and saves the captured values after caller mutation", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { result } = renderHook(useAbout, { wrapper: ({ children }) => <AboutProvider request={request}>{children}</AboutProvider> });
  const submitted = { heading: "Captured", biography: "Captured biography" };
  let saving!: Promise<void>;
  await act(async () => {
    saving = result.current.save(submitted);
    await expect(result.current.save(submitted)).rejects.toThrow("already in progress");
    submitted.biography = "Later mutation";
  });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await saving; });
  expect(result.current.saved.biography).toBe("Captured biography");
  expect(result.current.pending).toBe(false);
});

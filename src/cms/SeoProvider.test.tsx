import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SeoProvider, useSeo } from "./SeoProvider";
import { initialSeo } from "./seo";

it("rejects invalid defaults, paths, duplicates and blank overrides before requesting", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(useSeo, { wrapper: ({ children }) => <SeoProvider request={request}>{children}</SeoProvider> });
  const baseline = result.current.saved;
  await act(async () => {
    await expect(result.current.saveDefaults({ title: " ", description: "Description" })).rejects.toThrow("default SEO title");
    for (const value of [
      { id: "new", path: "/%63ontact/", title: "Duplicate", description: "" },
      { id: "new", path: "/new", title: " ", description: "" },
      { id: "new", path: "/bad?query", title: "Invalid", description: "" },
    ]) await expect(result.current.saveRecord(value)).rejects.toThrow();
  });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.saved).toEqual(baseline);
  expect(result.current.pending).toBe(false);
});

it("normalizes only the captured path, preserves IDs/raw metadata and blocks simultaneous changes", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { result } = renderHook(useSeo, { wrapper: ({ children }) => <SeoProvider request={request}>{children}</SeoProvider> });
  const submitted = { ...initialSeo().records[0], path: "/%63ontact/", title: " Raw title ", description: " " };
  let saving!: ReturnType<typeof result.current.saveRecord>;
  await act(async () => {
    saving = result.current.saveRecord(submitted);
    await expect(result.current.deleteRecord(submitted.id)).rejects.toThrow("already in progress");
    submitted.path = "/later";
    submitted.title = "Later title";
  });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await saving; });
  const record = result.current.saved.records.find(({ id }) => id === submitted.id);
  expect(record).toEqual({ id: submitted.id, path: "/contact", title: " Raw title ", description: " " });
  expect(result.current.saved.records).toHaveLength(initialSeo().records.length);
});

it("releases the lock after failure, checks newly saved records and permits deletion without completeness validation", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  const { result } = renderHook(useSeo, { wrapper: ({ children }) => <SeoProvider request={request}>{children}</SeoProvider> });
  const draft = { id: "new", path: "/new/", title: "", description: "Description only" };
  await act(async () => { await expect(result.current.saveRecord(draft)).rejects.toThrow("Save failed"); });
  expect(result.current.pending).toBe(false);
  expect(result.current.saved.records.some(({ id }) => id === "new")).toBe(false);
  await act(async () => { await result.current.saveRecord(draft); });
  await act(async () => { await expect(result.current.saveRecord({ ...draft, id: "duplicate", path: "/%6Eew" })).rejects.toThrow("already exists"); });
  expect(request).toHaveBeenCalledTimes(2);
  await act(async () => { await result.current.deleteRecord("new"); });
  expect(result.current.saved.records.some(({ id }) => id === "new")).toBe(false);
});

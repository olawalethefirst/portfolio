import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProjectProvider, useProjects } from "./ProjectProvider";
import { emptyProject, initialProjects } from "./projects";

it("allows over-limit incomplete saves but rejects incomplete and over-limit publishing before requests", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(useProjects, { wrapper: ({ children }) => <ProjectProvider request={request}>{children}</ProjectProvider> });
  const draft = { ...emptyProject(), name: "a".repeat(12), liveUrl: "unfinished" };
  await act(async () => { await expect(result.current.commit("new", draft, "publish")).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.pending).toBe(false);
  await act(async () => { await result.current.commit("new", draft, "save"); });
  expect(result.current.records[0]).toEqual({ id: "new", draft, published: null });
  const complete = { ...initialProjects()[0].draft, name: "a".repeat(12) };
  await act(async () => { await expect(result.current.commit("new", complete, "publish")).rejects.toThrow(); });
  expect(request).toHaveBeenCalledTimes(1);
});

it("rejects malformed draft structure", async () => {
  const request = vi.fn();
  const { result } = renderHook(useProjects, { wrapper: ({ children }) => <ProjectProvider request={request}>{children}</ProjectProvider> });
  const malformed = JSON.parse(JSON.stringify({ ...emptyProject(), decorative: "yes" }));
  await act(async () => { await expect(result.current.commit("new", malformed, "save")).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
});

it("captures published submissions, blocks duplicates and keeps later draft saves separate", async () => {
  let finish!: () => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; })).mockResolvedValue(undefined);
  const { result } = renderHook(useProjects, { wrapper: ({ children }) => <ProjectProvider request={request}>{children}</ProjectProvider> });
  const draft = { ...initialProjects()[0].draft, name: "Submitted" };
  let saving!: Promise<void>;
  await act(async () => {
    saving = result.current.commit("field-notes", draft, "publish");
    await expect(result.current.commit("field-notes", draft, "save")).rejects.toThrow("still being saved");
    draft.name = "Later edit";
  });
  await act(async () => { finish(); await saving; });
  expect(result.current.records[0].published?.name).toBe("Submitted");
  await act(async () => { await result.current.commit("field-notes", draft, "save"); });
  expect(result.current.records[0].draft.name).toBe("Later edit");
  expect(result.current.records[0].published?.name).toBe("Submitted");
});

it("recovers after failure and permits incomplete unpublish/delete without replacing the saved draft", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Request failed")).mockResolvedValue(undefined);
  const { result } = renderHook(useProjects, { wrapper: ({ children }) => <ProjectProvider request={request}>{children}</ProjectProvider> });
  const baseline = result.current.records[0];
  await act(async () => { await expect(result.current.commit(baseline.id, emptyProject(), "unpublish")).rejects.toThrow("Request failed"); });
  expect(result.current.records[0]).toEqual(baseline);
  expect(result.current.pending).toBe(false);
  await act(async () => { await result.current.commit(baseline.id, emptyProject(), "unpublish"); });
  expect(result.current.records[0]).toEqual({ ...baseline, published: null });
  await act(async () => { await result.current.commit(baseline.id, emptyProject(), "delete"); });
  expect(result.current.records.some(({ id }) => id === baseline.id)).toBe(false);
});

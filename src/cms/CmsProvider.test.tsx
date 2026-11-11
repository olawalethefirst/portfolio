import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CmsProvider, useCms } from "./CmsProvider";
import { emptyPublication } from "./publications";

const complete = () => ({ ...emptyPublication(), title: "Article", summary: "Summary", bodyMarkdown: "Body", coverSrc: "/cover.png", coverAlt: "Cover description", publishedOn: "2026-11-09" });
const today = () => "2026-11-09";

it("enforces action schemas with injected today, while incomplete/over-limit drafts remain saveable", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(useCms, { wrapper: ({ children }) => <CmsProvider initialRecords={[]} request={request} today={today}>{children}</CmsProvider> });
  await act(async () => {
    for (const draft of [emptyPublication(), { ...complete(), title: "a".repeat(41) }, { ...complete(), publishedOn: "2026-11-10" }]) {
      await expect(result.current.commit("new", draft, "publish")).rejects.toThrow();
    }
  });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.pending).toBe(false);
  const draft = { ...emptyPublication(), title: "a".repeat(41), publishedOn: "unfinished" };
  await act(async () => { await result.current.commit("new", draft, "save"); });
  expect(result.current.records[0]).toEqual({ id: "new", draft, published: null });
});

it("captures published content, blocks duplicate changes and isolates subsequent saved drafts", async () => {
  let finish!: () => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; })).mockResolvedValue(undefined);
  const { result } = renderHook(useCms, { wrapper: ({ children }) => <CmsProvider initialRecords={[]} request={request} today={today}>{children}</CmsProvider> });
  const draft = complete();
  let saving!: Promise<void>;
  await act(async () => {
    saving = result.current.commit("new", draft, "publish");
    await expect(result.current.commit("new", draft, "save")).rejects.toThrow("still being saved");
    draft.title = "Later edit";
  });
  await act(async () => { finish(); await saving; });
  expect(result.current.records[0].published?.title).toBe("Article");
  await act(async () => { await result.current.commit("new", draft, "save"); });
  expect(result.current.records[0].draft.title).toBe("Later edit");
  expect(result.current.records[0].published?.title).toBe("Article");
});

it("rejects malformed draft shape without requests and recovers from failed publishing", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Request failed")).mockResolvedValue(undefined);
  const { result } = renderHook(useCms, { wrapper: ({ children }) => <CmsProvider initialRecords={[]} request={request} today={today}>{children}</CmsProvider> });
  await act(async () => { await expect(result.current.commit("new", JSON.parse(JSON.stringify({ ...emptyPublication(), bodyMarkdown: 123 })), "save")).rejects.toThrow(); });
  expect(request).not.toHaveBeenCalled();
  await act(async () => { await expect(result.current.commit("new", complete(), "publish")).rejects.toThrow("Request failed"); });
  expect(result.current.records).toEqual([]);
  expect(result.current.pending).toBe(false);
  await act(async () => { await result.current.commit("new", complete(), "publish"); });
  await act(async () => { await result.current.commit("new", emptyPublication(), "unpublish"); });
  expect(result.current.records[0]).toEqual({ id: "new", draft: complete(), published: null });
  await act(async () => { await result.current.commit("new", emptyPublication(), "delete"); });
  expect(result.current.records).toEqual([]);
});

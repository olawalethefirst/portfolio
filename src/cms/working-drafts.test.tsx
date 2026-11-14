import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { useDraftStore, useWorkingDraft, useReconciledDraft } from "./working-drafts";

const schema = z.object({ title: z.string() });
const initial = () => ({ title: "Initial" });
function useDraft(namespace = "test", key = "record") {
  const store = useDraftStore({ namespace, schema });
  return { store, draft: useWorkingDraft(store, key, initial) };
}
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("restores incomplete edits after a reload without overwriting them with initial values", () => {
  const first = renderHook(() => useDraft());
  act(() => first.result.current.draft.setValue({ title: "" }));
  act(() => vi.advanceTimersByTime(300));
  expect(first.result.current.draft.persistenceStatus).toBe("saved");
  first.unmount();
  const restored = renderHook(() => useDraft());
  expect(restored.result.current.draft.value.title).toBe("");
});
it("isolates form namespaces and record keys", () => {
  const first = renderHook(() => useDraft());
  act(() => first.result.current.draft.setValue({ title: "Edited" }));
  first.unmount();
  expect(renderHook(() => useDraft("other")).result.current.draft.value.title).toBe("Initial");
  expect(renderHook(() => useDraft("test", "other")).result.current.draft.value.title).toBe("Initial");
});
it("persists a discard immediately and prevents an older queued edit returning", () => {
  const first = renderHook(() => useDraft());
  act(() => first.result.current.draft.setValue({ title: "Edited" }));
  act(() => first.result.current.draft.reset(initial()));
  act(() => vi.advanceTimersByTime(300));
  first.unmount();
  expect(renderHook(() => useDraft()).result.current.draft.value.title).toBe("Initial");
});
it("clears a new draft and its record alias without a pending write resurrecting it", () => {
  const first = renderHook(() => useDraft("test", "new"));
  const id = first.result.current.draft.id;
  act(() => first.result.current.draft.setValue({ title: "Edited" }));
  act(() => first.result.current.store.clear(id));
  act(() => vi.advanceTimersByTime(300));
  first.unmount();
  expect(renderHook(() => useDraft("test", "new")).result.current.draft.value.title).toBe("Initial");
});
it("keeps edits in memory on write failure and retries on a later flush", () => {
  const first = renderHook(() => useDraft());
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
  act(() => first.result.current.draft.setValue({ title: "Keep me" }));
  act(() => vi.advanceTimersByTime(300));
  expect(first.result.current.draft.value.title).toBe("Keep me");
  expect(first.result.current.draft.persistenceStatus).toBe("error");
  write.mockRestore();
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => first.result.current.store.flush());
  expect(first.result.current.draft.persistenceStatus).toBe("saved");
});
it("reports a malformed stored draft and falls back without crashing", () => {
  localStorage.setItem("portfolio:cms-drafts:v1:test:record", JSON.stringify({ id: "record", value: { title: 42 } }));
  const restored = renderHook(() => useDraft());
  expect(restored.result.current.draft.value.title).toBe("Initial");
  expect(restored.result.current.draft.persistenceStatus).toBe("restore-error");
});

it("debounces writes and flushes the latest value when the page is hidden", () => {
  const first = renderHook(() => useDraft());
  const write = vi.spyOn(Storage.prototype, "setItem");
  act(() => first.result.current.draft.setValue({ title: "First" }));
  act(() => vi.advanceTimersByTime(200));
  act(() => first.result.current.draft.setValue({ title: "Latest" }));
  act(() => vi.advanceTimersByTime(200));
  expect(write).not.toHaveBeenCalled();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(write).toHaveBeenCalledTimes(1);
  first.unmount();
  expect(renderHook(() => useDraft()).result.current.draft.value.title).toBe("Latest");
});
it("preserves the generated ID of a new draft and keeps its record alias editable", () => {
  const first = renderHook(() => useDraft("test", "new"));
  const id = first.result.current.draft.id;
  act(() => first.result.current.draft.setValue({ title: "New draft" }));
  first.unmount();
  const restored = renderHook(() => useDraft("test", id));
  expect(restored.result.current.draft.id).toBe(id);
  expect(restored.result.current.draft.value.title).toBe("New draft");
  act(() => restored.result.current.draft.setValue({ title: "Alias edit" }));
  restored.unmount();
  expect(renderHook(() => useDraft("test", "new")).result.current.draft.value.title).toBe("Alias edit");
  expect(localStorage.length).toBe(1);
});
it("allows editing when storage cannot be read", () => {
  vi.spyOn(Storage.prototype, "length", "get").mockImplementation(() => { throw new Error("Blocked"); });
  const first = renderHook(() => useDraft());
  expect(first.result.current.draft.ready).toBe(true);
  expect(first.result.current.draft.persistenceStatus).toBe("restore-error");
  act(() => first.result.current.draft.setValue({ title: "Still editable" }));
  expect(first.result.current.draft.value.title).toBe("Still editable");
});


function useReview(saved = initial()) {
  const store = useDraftStore({ namespace: "review", schema });
  return { store, review: useReconciledDraft(store, "record", saved) };
}
const reviewKey = "portfolio:cms-drafts:v1:review:record";

it("clears saved drafts and queued writes, then only persists edits made after Save", () => {
  const page = renderHook(({ saved }) => useReview(saved), { initialProps: { saved: initial() } });
  act(() => page.result.current.review.edit(() => ({ title: "Submitted" })));
  act(() => page.result.current.review.reset());
  page.rerender({ saved: { title: "Canonical" } });
  act(() => vi.advanceTimersByTime(300));
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(localStorage.getItem(reviewKey)).toBeNull();
  expect(page.result.current.review.value.title).toBe("Canonical");
  expect(page.result.current.review.draft).toBeUndefined();
  act(() => page.result.current.review.edit(() => ({ title: "Later edit" })));
  page.unmount();
  const next = renderHook(() => useReview({ title: "Canonical" }));
  expect(next.result.current.review.value.title).toBe("Canonical");
  expect(next.result.current.review.draft?.title).toBe("Later edit");
});

it("reports failed local cleanup and retries removal without restoring old edits", () => {
  const page = renderHook(({ saved }) => useReview(saved), { initialProps: { saved: initial() } });
  act(() => page.result.current.review.edit(() => ({ title: "Submitted" })));
  act(() => page.result.current.store.flush());
  const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Blocked"); });
  act(() => page.result.current.review.reset());
  expect(page.result.current.review.persistenceStatus).toBe("error");
  expect(page.result.current.review.value.title).toBe("Initial");
  remove.mockRestore();
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(localStorage.getItem(reviewKey)).toBeNull();
  expect(page.result.current.review.persistenceStatus).toBe("idle");
});

it("uses fresh server values before editing and preserves active edits during refresh", () => {
  const page = renderHook(({ saved }) => useReview(saved), { initialProps: { saved: initial() } });
  page.rerender({ saved: { title: "Fresh server" } });
  expect(page.result.current.review.value.title).toBe("Fresh server");
  act(() => page.result.current.review.edit(() => ({ title: "My edit" })));
  page.rerender({ saved: { title: "Newer server" } });
  expect(page.result.current.review.value.title).toBe("My edit");
  expect(page.result.current.review.draft?.title).toBe("My edit");
});

it("follows refreshed server content after resetting a completed editing session", () => {
  const page = renderHook(({ saved }) => useReview(saved), { initialProps: { saved: initial() } });
  act(() => page.result.current.review.edit(() => ({ title: "Unsaved" })));
  act(() => page.result.current.review.reset());
  page.rerender({ saved: { title: "Updated remotely" } });
  expect(page.result.current.review.value.title).toBe("Updated remotely");
  expect(page.result.current.review.draft).toBeUndefined();
});

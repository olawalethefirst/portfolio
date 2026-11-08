import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useCmsUnsavedChanges } from "./CmsUnsavedChanges";

it("warns on unload only while dirty and lets clean navigation and explicit discard proceed without saving", () => {
  const save = vi.fn(async () => true);
  const navigate = vi.fn();
  const { result, rerender, unmount } = renderHook(({ dirty }) => useCmsUnsavedChanges({ dirty, pending: false, save, navigate }), { initialProps: { dirty: false } });
  const unload = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(unload()).toBe(false);
  act(() => result.current.leave("/admin/projects"));
  expect(navigate).toHaveBeenCalledExactlyOnceWith("/admin/projects");
  navigate.mockClear();
  rerender({ dirty: true });
  expect(unload()).toBe(true);
  act(() => result.current.leave("/admin/hero"));
  expect(navigate).not.toHaveBeenCalled();
  act(() => result.current.dialog.onStay());
  expect(navigate).not.toHaveBeenCalled();
  act(() => result.current.leave("/admin/publications"));
  act(() => result.current.dialog.onDiscard());
  expect(navigate).toHaveBeenCalledExactlyOnceWith("/admin/publications");
  expect(save).not.toHaveBeenCalled();
  unmount();
  expect(unload()).toBe(false);
});

it("blocks duplicate saves, dismissal, discard and destination changes until the save finishes", async () => {
  let finish!: (saved: boolean) => void;
  const save = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  const navigate = vi.fn();
  const { result } = renderHook(() => useCmsUnsavedChanges({ dirty: true, pending: false, save, navigate }));
  act(() => result.current.leave("/admin/projects"));
  let saving!: Promise<void>;
  act(() => {
    saving = result.current.dialog.onSave();
    void result.current.dialog.onSave();
    result.current.dialog.onStay();
    result.current.dialog.onDiscard();
    result.current.leave("/admin/hero");
  });
  expect(save).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
  await act(async () => { finish(false); await saving; });
  expect(navigate).not.toHaveBeenCalled();
  act(() => { saving = result.current.dialog.onSave(); });
  await act(async () => { finish(true); await saving; });
  expect(navigate).toHaveBeenCalledExactlyOnceWith("/admin/projects");
});

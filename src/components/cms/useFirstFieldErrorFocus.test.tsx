import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFirstFieldErrorFocus } from "./useFirstFieldErrorFocus";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const formRef = { current: null as HTMLFormElement | null };
  render(<form ref={(form) => { formRef.current = form; }}>
    <input name="first" aria-label="First" />
    <input name="second" aria-label="Second" />
  </form>);
  return renderHook(() => useFirstFieldErrorFocus(formRef, ["first", "second"] as const));
}

it("focuses the first invalid field in supplied order after rendering feedback", () => {
  const { result } = setup();
  act(() => result.current({ second: "Invalid", first: "Invalid" }));
  expect(document.activeElement).not.toBe(screen.getByRole("textbox", { name: "First" }));
  act(() => vi.advanceTimersByTime(20));
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "First" }));
});

it("leaves focus unchanged when there are no field errors", () => {
  const { result } = setup();
  const second = screen.getByRole("textbox", { name: "Second" });
  second.focus();
  act(() => result.current({}));
  act(() => vi.advanceTimersByTime(20));
  expect(document.activeElement).toBe(second);
});

it("cancels scheduled focus when its owner unmounts", () => {
  const { result, unmount } = setup();
  act(() => result.current({ first: "Invalid" }));
  unmount();
  act(() => vi.advanceTimersByTime(20));
  expect(document.activeElement).not.toBe(screen.getByRole("textbox", { name: "First" }));
});

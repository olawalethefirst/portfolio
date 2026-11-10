import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useActivePublicationHeading } from "./useActivePublicationHeading";

const headings = ["first", "second", "last"].map((id) => ({ id, label: id, level: 2 as const }));
let positions: number[];
let container: HTMLDivElement;
let notifyObserver: () => void;
const disconnect = vi.fn();
let frames: Map<number, FrameRequestCallback>;
let frameId: number;

function flush() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

beforeEach(() => {
  positions = [200, 600, 1000];
  frames = new Map(); frameId = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: () => void) { notifyObserver = callback; }
    observe = vi.fn();
    disconnect = disconnect;
  });
  container = document.createElement("div");
  headings.forEach(({ id }, index) => {
    const heading = document.createElement("h2"); heading.id = id;
    vi.spyOn(heading, "getBoundingClientRect").mockImplementation(() => ({ top: positions[index] }) as DOMRect);
    container.append(heading);
  });
  document.body.append(container);
  disconnect.mockClear();
});
afterEach(() => {
  cleanup(); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  window.history.replaceState(null, "", window.location.pathname);
});

it("tracks downward and upward movement, keeping a section active across long gaps", () => {
  const { result } = renderHook(() => useActivePublicationHeading(headings));
  flush(); expect(result.current).toBeNull();
  positions = [30, 400, 900];
  act(() => notifyObserver()); flush(); expect(result.current).toBe("first");
  positions = [-600, -200, 500];
  act(() => window.dispatchEvent(new Event("scroll"))); flush(); expect(result.current).toBe("second");
  positions = [-20, 400, 800];
  act(() => window.dispatchEvent(new Event("scroll"))); flush(); expect(result.current).toBe("first");
  positions = [200, 600, 1000];
  act(() => window.dispatchEvent(new Event("scroll"))); flush(); expect(result.current).toBeNull();
});

it("initializes at a direct anchor and handles fast jumps through the final section without rewriting the hash", () => {
  window.history.replaceState(null, "", "#second");
  positions = [-400, 32, 500];
  const { result } = renderHook(() => useActivePublicationHeading(headings));
  flush(); expect(result.current).toBe("second");
  positions = [-1200, -700, -100];
  act(() => window.dispatchEvent(new Event("scroll"))); flush();
  expect(result.current).toBe("last"); expect(window.location.hash).toBe("#second");
  positions = [-200, 32, 700];
  act(() => window.dispatchEvent(new Event("hashchange"))); flush(); expect(result.current).toBe("second");
});

it("selects the final heading at the page bottom even if it cannot reach the activation line", () => {
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
  vi.stubGlobal("innerHeight", 800); vi.stubGlobal("scrollY", 1200);
  positions = [-600, -100, 500];
  const { result } = renderHook(() => useActivePublicationHeading(headings));
  flush(); expect(result.current).toBe("last");
});

it("coalesces checks and releases observers and pending frames on unmount", () => {
  const { unmount } = renderHook(() => useActivePublicationHeading(headings));
  act(() => { notifyObserver(); window.dispatchEvent(new Event("scroll")); window.dispatchEvent(new Event("resize")); });
  expect(frames.size).toBe(1);
  unmount(); expect(frames.size).toBe(0); expect(disconnect).toHaveBeenCalledOnce();
  act(() => window.dispatchEvent(new Event("scroll"))); expect(frames.size).toBe(0);
});

it("works without IntersectionObserver and clears stale article selections", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  positions = [-100, -20, 300];
  const { result, rerender } = renderHook(({ entries }) => useActivePublicationHeading(entries), { initialProps: { entries: headings } });
  flush(); expect(result.current).toBe("second");
  rerender({ entries: [] }); expect(result.current).toBeNull();
});

import { act, renderHook } from "@testing-library/react";
import type { MotionValue } from "motion/react";
import { describe, expect, it, vi } from "vitest";

interface PlaybackOptions {
  onComplete?: () => void;
}

const playback = vi.hoisted(() => {
  let complete: (() => void) | undefined;
  let shouldReduceMotion = false;
  const stop = vi.fn();

  return {
    animate: vi.fn(
      (
        _progress: MotionValue<number>,
        _target: number,
        options: PlaybackOptions,
      ) => {
        complete = options.onComplete;
        return { stop };
      },
    ),
    complete() {
      complete?.();
    },
    prefersReducedMotion() {
      return shouldReduceMotion;
    },
    setReducedMotion(value: boolean) {
      shouldReduceMotion = value;
    },
    stop,
  };
});

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    animate: playback.animate,
    useReducedMotion: () => playback.prefersReducedMotion(),
  };
});

import { usePrismAutoplay } from "./usePrismAutoplay";

describe("usePrismAutoplay", () => {
  it("loops through the ordered prism states when playback completes", () => {
    const { result } = renderHook(() => usePrismAutoplay());

    expect(result.current.state).toBe("solution");
    expect(result.current.isAutoplayRunning).toBe(true);

    act(() => playback.complete());
    expect(result.current.state).toBe("idea");

    act(() => playback.complete());
    expect(result.current.state).toBe("iterate");

    act(() => playback.complete());
    expect(result.current.state).toBe("solution");
  });

  it("resets progress when a segment is selected and can pause explicitly", () => {
    const { result } = renderHook(() => usePrismAutoplay());
    result.current.autoplayProgress.set(64);

    act(() => result.current.selectState("solution"));
    expect(result.current.state).toBe("solution");
    expect(result.current.autoplayProgress.get()).toBe(0);

    act(() => result.current.pauseAutoplay());
    expect(result.current.isAutoplayRunning).toBe(false);
    expect(playback.stop).toHaveBeenCalled();
  });

  it("presents a stable non-running state when reduced motion is preferred", () => {
    playback.setReducedMotion(true);

    const { result } = renderHook(() => usePrismAutoplay());

    expect(result.current.state).toBe("solution");
    expect(result.current.isAutoplayRunning).toBe(false);
    expect(result.current.canAutoplay).toBe(false);
    expect(result.current.autoplayProgress.get()).toBe(0);

    playback.setReducedMotion(false);
  });
});

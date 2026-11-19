import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

import { useBack } from "./useBack";

function setNavigation(canGoBack: boolean | undefined) {
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: canGoBack === undefined ? undefined : { canGoBack },
  });
}
function setReferrer(referrer: string) {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: referrer,
  });
}

describe("useBack", () => {
  beforeEach(() => {
    back.mockReset();
    push.mockReset();
  });
  afterEach(() => {
    setNavigation(undefined);
    setReferrer("");
  });

  it("steps back when the previous entry belongs to the app", () => {
    setNavigation(true);
    const { result } = renderHook(() => useBack());
    act(() => result.current());
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("goes to the home page when there is no previous app entry", () => {
    setNavigation(false);
    const { result } = renderHook(() => useBack());
    act(() => result.current());
    expect(push).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });

  it("uses a custom fallback route", () => {
    setNavigation(false);
    const { result } = renderHook(() => useBack("/contact"));
    act(() => result.current());
    expect(push).toHaveBeenCalledWith("/contact");
  });

  it("falls back to a same-origin referrer where the Navigation API is missing", () => {
    setNavigation(undefined);
    setReferrer(`${window.location.origin}/contact`);
    const { result } = renderHook(() => useBack());
    act(() => result.current());
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("never leaves the site on an external or missing referrer without the Navigation API", () => {
    setNavigation(undefined);
    for (const referrer of ["", "https://search.example/results"]) {
      setReferrer(referrer);
      const { result } = renderHook(() => useBack());
      act(() => result.current());
    }
    expect(back).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(2);
  });
});

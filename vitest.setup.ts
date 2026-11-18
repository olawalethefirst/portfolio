import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// jsdom has no matchMedia, which browsers (and libraries such as motion and GSAP)
// assume. Tests that care stub their own.
beforeEach(() => {
  if (typeof window.matchMedia === "function") return;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

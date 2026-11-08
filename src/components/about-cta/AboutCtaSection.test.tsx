import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { AboutCtaSection } from "./AboutCtaSection";

afterEach(() => vi.unstubAllGlobals());

function reducedMotionPreference(initial: boolean) {
  vi.stubGlobal("scrollTo", vi.fn());
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return matches; },
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  })));
  return (next: boolean) => act(() => {
    matches = next;
    listeners.forEach((listener) => listener());
  });
}

describe("About CTA", () => {
  it("renders fully readable text on the server", () => {
    const markup = renderToString(<AboutCtaSection summary="An intact summary." />);
    expect(markup).toContain("An intact summary.");
    expect(markup).not.toContain("opacity:");
  });

  it("restores full visibility when reduced motion changes live", () => {
    const setPreference = reducedMotionPreference(false);
    render(<AboutCtaSection summary="Hello." />);
    setPreference(true);
    const paragraph = screen.getByText("Hello.", { selector: "p" });
    expect(paragraph.textContent).toBe("Hello.");
    expect(paragraph.querySelector("[style*='opacity']")).toBeNull();
    setPreference(false);
    expect(paragraph.querySelector("[style*='opacity']")).not.toBeNull();
  });

  it("accepts editable heading and biography without changing its contact CTA", () => {
    reducedMotionPreference(true);
    render(<AboutCtaSection heading="Meet the maker" summary="A custom biography." />);
    expect(screen.getByRole("region", { name: "Meet the maker" })).toBeTruthy();
    expect(screen.getByText("A custom biography.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start a conversation" }).getAttribute("href")).toBe("/contact");
  });

  it("links the conversation CTA to the contact form", () => {
    reducedMotionPreference(true);
    render(<AboutCtaSection />);
    const link = screen.getByRole("link", { name: "Start a conversation" });
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(link.getAttribute("href")).toBe("/contact");
  });
});

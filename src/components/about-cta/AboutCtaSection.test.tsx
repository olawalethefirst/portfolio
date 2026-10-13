import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("keeps the CTA focusable without alignment toggle semantics", () => {
    reducedMotionPreference(true);
    render(<AboutCtaSection />);
    const button = screen.getByRole("button", { name: "Start a conversation" });
    button.focus();
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    expect(button.hasAttribute("aria-describedby")).toBe(false);
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    expect(button.getAttribute("type")).toBe("button");
  });
});
